// server/routes/quizRoutes.js
import express from "express";
import Quiz from "../models/quizModel.js";
import Certificate from "../models/certificateModel.js";
import CodeSubmission from "../models/codeSubmissionModel.js";
import protect from "../middleware/authMiddleware.js";
import PDFDocument from "pdfkit";
import cloudinary from "../utils/cloudinary.js";
import fs from "fs";
import path from "path";
import axios from "axios";
import User from "../models/authModel.js";
import { recordQuizResult } from "../utils/rewardSystem.js"; // NEW

const router = express.Router();

/** Helper: remove correctIndex before sending to client */
function safeQuizForClient(quizDoc) {
  if (!quizDoc) return null;
  const q = quizDoc.toObject ? quizDoc.toObject() : { ...quizDoc };
  if (Array.isArray(q.questions)) {
    q.questions = q.questions.map(({ correctIndex, ...rest }) => rest);
  }
  return q;
}

/** Judge0 config from env */
const JUDGE0_BASE = process.env.JUDGE0_BASE || "https://judge0-ce.p.rapidapi.com";
const JUDGE0_KEY = process.env.JUDGE0_KEY || "";
const JUDGE0_HOST = process.env.JUDGE0_HOST || ""; // e.g. judge0-ce.p.rapidapi.com

function judge0Headers() {
  const headers = { "Content-Type": "application/json" };
  if (JUDGE0_KEY) headers["X-RapidAPI-Key"] = JUDGE0_KEY;
  if (JUDGE0_HOST) headers["X-RapidAPI-Host"] = JUDGE0_HOST;
  return headers;
}

/**
 * Execute code on Judge0 synchronously (wait=true)
 * payload: { source_code, language_id, stdin? }
 * returns result object or null on error.
 */
async function executeOnJudge0(payload) {
  try {
    const url = `${JUDGE0_BASE.replace(/\/$/, "")}/submissions?wait=true&base64_encoded=false`;
    const res = await axios.post(url, payload, {
      headers: judge0Headers(),
      timeout: 30000,
    });
    return res.data || null;
  } catch (err) {
    console.warn("Judge0 execute error:", err?.response?.data || err?.message || err);
    return null;
  }
}

/** GET quiz (no answers) */
router.get("/:courseId", protect, async (req, res) => {
  try {
    const quiz = await Quiz.findOne({ courseId: req.params.courseId });
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });
    return res.json(safeQuizForClient(quiz));
  } catch (err) {
    console.error("GET /quiz/:courseId error:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
});

/**
 * POST /api/quiz/:courseId/submit
 * Body: { answers: [index|null,...] }
 *
 * Grades MCQs and code questions (using saved CodeSubmission or Judge0).
 * Updates user points and badges, returns score + details + certificate (if passed).
 */
router.post("/:courseId/submit", protect, async (req, res) => {
  try {
    const { answers } = req.body || {};
    const quiz = await Quiz.findOne({ courseId: req.params.courseId });
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });

    if (!Array.isArray(quiz.questions) || quiz.questions.length === 0) {
      return res.status(400).json({ message: "Quiz has no questions" });
    }

    // get user document (we'll use recordQuizResult helper to persist points/badges/history)
    const userDoc = await User.findById(req.user.id);
    if (!userDoc) return res.status(404).json({ message: "User not found" });

    // Normalize submitted answers to length
    const qCount = quiz.questions.length;
    const submitted = Array.isArray(answers) ? answers.slice(0, qCount) : [];
    for (let i = submitted.length; i < qCount; i++) submitted[i] = null;

    // Prepare arrays for results
    const correctAnswers = new Array(qCount).fill(null); // for MCQs will store number; for code remains null
    let correctCount = 0;

    // First: grade MCQs and mark correctAnswers for MCQs
    for (let i = 0; i < qCount; i++) {
      const q = quiz.questions[i];
      if (!q || q.type === "code") continue; // skip code questions here
      const correctIndex = typeof q.correctIndex === "number" ? q.correctIndex : null;
      correctAnswers[i] = correctIndex;
      if (submitted[i] !== null && submitted[i] === correctIndex) correctCount++;
    }

    // Next: handle code questions (auto-grade using saved submission or Judge0)
    const codeResults = []; // { index, passed: bool, expected, got, error? }
    for (let i = 0; i < qCount; i++) {
      const q = quiz.questions[i];
      if (!q || q.type !== "code") continue;

      const expectedRaw = String(q.expectedOutput || "").replace(/\r/g, "");
      const expectedNormalized = expectedRaw.trim();

      // try to find latest CodeSubmission by this user for this course
      const latestSub = await CodeSubmission.findOne({
        userId: req.user.id,
        courseId: req.params.courseId,
      }).sort({ createdAt: -1 });

      let execResult = null;
      let usedSubmission = null;

      if (latestSub) {
        usedSubmission = latestSub;
        if (latestSub.rawResult) {
          execResult = latestSub.rawResult;
        } else if (latestSub.stdout || latestSub.stderr || latestSub.compileOutput) {
          execResult = {
            stdout: latestSub.stdout || "",
            stderr: latestSub.stderr || "",
            compile_output: latestSub.compileOutput || "",
            time: latestSub.time || "",
            memory: latestSub.memory || "",
          };
        }
      }

      // If we don't have a result yet, attempt to execute via Judge0 (only if numeric languageId available)
      if (!execResult && usedSubmission) {
        let languageId = q.languageId || usedSubmission.languageId || null;

        if (!languageId && usedSubmission.languageName) {
          // no safe resolver here — skip execution if no numeric id
          languageId = null;
        }

        if (!languageId) {
          codeResults.push({
            index: i,
            passed: false,
            expected: expectedNormalized,
            got: null,
            error: "No numeric languageId available to execute submission",
          });
          continue;
        }

        const payload = {
          source_code: usedSubmission.source || usedSubmission.code || "",
          language_id: Number(languageId),
          stdin: usedSubmission.stdin || "",
        };

        const jres = await executeOnJudge0(payload);
        if (!jres) {
          codeResults.push({
            index: i,
            passed: false,
            expected: expectedNormalized,
            got: null,
            error: "Judge0 execution failed",
          });
          continue;
        }

        // Save result snapshot back to submission (best-effort)
        try {
          usedSubmission.status = "done";
          usedSubmission.rawResult = jres;
          usedSubmission.stdout = jres.stdout || "";
          usedSubmission.stderr = jres.stderr || "";
          usedSubmission.compileOutput = jres.compile_output || "";
          usedSubmission.time = jres.time || "";
          usedSubmission.memory = jres.memory || "";
          await usedSubmission.save();
        } catch (e) {
          console.warn("Failed to save submission result:", e.message || e);
        }
        execResult = jres;
      }

      if (!execResult) {
        codeResults.push({
          index: i,
          passed: false,
          expected: expectedNormalized,
          got: null,
          error: "No submission/result available",
        });
        continue;
      }

      const stdoutRaw = String(execResult.stdout || "").replace(/\r/g, "");
      const stdoutNormalized = stdoutRaw.trim();
      const passed = stdoutNormalized === expectedNormalized;

      if (passed) correctCount++;

      codeResults.push({
        index: i,
        passed,
        expected: expectedNormalized,
        got: stdoutNormalized,
        time: execResult.time || null,
        memory: execResult.memory || null,
        compileOutput: execResult.compile_output || null,
        stderr: execResult.stderr || null,
      });
    }

    // compute percent across all questions (MCQ + code included equally)
    const percent = Math.round((correctCount / qCount) * 100);

    // Reward points: simple rule => each correct question = 5 points; code correct gets same weighting
    const pointsFromThisAttempt = correctCount * 5;

    // decide badge (idempotent)
    let badgeToAward = null;
    if (percent === 100) badgeToAward = "Quiz Master";
    else if (percent >= (quiz.passPercent || 60)) badgeToAward = "Passed Quiz";

    // Record quiz result and award points/badge (helper will update user)
    // recordQuizResult will append history + award points + badge if provided
    const updatedUser = await recordQuizResult(req.user.id, {
      courseId: req.params.courseId,
      score: percent,
      awardPoints: pointsFromThisAttempt,
      badge: badgeToAward,
    });

    // If failed -> return details (score + answers + codeResults + user stats)
    if (percent < (quiz.passPercent || 60)) {
      return res.json({
        message: "Failed",
        score: percent,
        correctAnswers,
        codeResults,
        points: updatedUser?.points ?? null,
        badges: updatedUser?.badges ?? null,
      });
    }

    // Passed -> generate certificate (pdf -> upload)
    // create PDF cert for updatedUser
    const doc = new PDFDocument({ size: "A4", margin: 48 });
    const buffers = [];
    doc.on("data", (b) => buffers.push(b));
    doc.on("error", (err) => {
      console.error("PDFDocument error:", err);
    });

    doc.on("end", async () => {
      try {
        const pdfBuffer = Buffer.concat(buffers);

        // upload as raw to Cloudinary
        const upload = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { resource_type: "raw", folder: "eduoding_certificates" },
            (error, result) => (error ? reject(error) : resolve(result))
          );
          stream.end(pdfBuffer);
        });

        const cert = await Certificate.create({
          userId: req.user.id,
          courseId: req.params.courseId,
          pdfUrl: upload.secure_url,
          score: percent,
          passed: true,
        });

        // also save reference in user certificates
        const freshUser = await User.findById(req.user.id);
        freshUser.certificates = freshUser.certificates || [];
        freshUser.certificates.push({ courseId: req.params.courseId, pdfUrl: upload.secure_url, score: percent });
        await freshUser.save();

        return res.json({
          message: "Passed",
          score: percent,
          correctAnswers,
          codeResults,
          certificate: cert,
          points: freshUser.points,
          badges: freshUser.badges,
        });
      } catch (err) {
        console.error("upload/save certificate error:", err);
        return res.status(500).json({ message: "Failed to upload/save certificate", error: err.message });
      }
    });

    // ----- Build PDF layout -----
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    doc.save();
    doc.lineWidth(1).strokeColor("#e6e6e6");
    doc.rect(36, 36, pageWidth - 72, pageHeight - 72).stroke();
    doc.restore();

    const logoPath = process.env.CERT_LOGO_PATH || path.join(process.cwd(), "uploads", "logo.png");
    if (fs.existsSync(logoPath)) {
      try {
        const logoWidth = 140;
        doc.image(logoPath, pageWidth / 2 - logoWidth / 2, 70, { width: logoWidth });
      } catch (e) { console.warn("logo add failed:", e.message); }
    }

    doc.moveDown(6);
    doc.font("Helvetica-Bold").fontSize(28).fillColor("#111827");
    doc.text("Eduoding Certificate", { align: "center" });

    doc.moveDown(1.2);
    doc.font("Helvetica").fontSize(12).fillColor("#444");
    doc.text("This certifies that", { align: "center" });

    doc.moveDown(0.6);
    const recipient = (updatedUser && (updatedUser.username || updatedUser.email)) || userDoc.username || userDoc.email || "Student";
    doc.font("Helvetica-Bold").fontSize(20).fillColor("#111");
    doc.text(recipient, { align: "center" });

    doc.moveDown(0.8);
    doc.font("Helvetica").fontSize(14).fillColor("#333");
    doc.text("has successfully completed the course", { align: "center" });
    doc.moveDown(0.3);
    doc.font("Helvetica-Bold").fontSize(16).text(`"${quiz.title}"`, { align: "center" });

    doc.moveDown(2);
    const issuedAt = new Date();
    const issuedDate = issuedAt.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
    const certId = `ED-${Date.now().toString(36).toUpperCase().slice(-8)}`;
    doc.font("Helvetica").fontSize(11).fillColor("#555");
    doc.text(`Issued: ${issuedDate}   •   Score: ${percent}%   •   ID: ${certId}`, { align: "center" });

    doc.moveDown(4);
    const sigImg = process.env.CERT_SIGNATURE_PATH || path.join(process.cwd(), "uploads", "signature.png");
    const sigLineY = doc.y;
    const sigLineWidth = pageWidth / 2;
    const sigLineX = pageWidth / 2 - sigLineWidth / 2;
    doc.moveTo(sigLineX, sigLineY).lineTo(sigLineX + sigLineWidth, sigLineY).stroke("#999");
    doc.font("Helvetica").fontSize(11).text("Instructor / Eduoding", sigLineX, sigLineY + 6, { width: sigLineWidth, align: "center" });

    if (fs.existsSync(sigImg)) {
      try { doc.image(sigImg, sigLineX + 20, sigLineY - 36, { width: 120 }); } catch (e) {}
    }

    doc.moveDown(6);
    doc.font("Helvetica").fontSize(9).fillColor("#777");
    doc.text("Eduoding — Practical learning. Real projects.", { align: "center" });

    doc.end();
  } catch (err) {
    console.error("POST /quiz/:courseId/submit error:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
});

/**
 * POST /api/quiz/:courseId/submit-code
 * Save a code submission (no execution here).
 * Body: { code: string, language?: string|id }
 */
router.post("/:courseId/submit-code", protect, async (req, res) => {
  try {
    const { code, language } = req.body || {};
    if (typeof code !== "string" || code.trim().length === 0) {
      return res.status(400).json({ message: "No code submitted" });
    }

    const submission = await CodeSubmission.create({
      userId: req.user.id,
      courseId: req.params.courseId,
      source: code, // use `source` to match codeRoutes expectation
      languageName: typeof language === "string" ? language : null,
      languageId: typeof language === "number" ? language : null,
      result: { status: "saved" },
      status: "saved",
    });

    return res.json({ message: "Code saved", submission });
  } catch (err) {
    console.error("POST /quiz/:courseId/submit-code error:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
});

/**
 * GET /api/quiz/:courseId/submissions
 * Return all code submissions by current user for the course
 */
router.get("/:courseId/submissions", protect, async (req, res) => {
  try {
    const subs = await CodeSubmission.find({
      userId: req.user.id,
      courseId: req.params.courseId,
    }).sort({ createdAt: -1 });

    return res.json(subs);
  } catch (err) {
    console.error("GET /quiz/:courseId/submissions error:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
});

/** GET /api/quiz/certificates/all */
router.get("/certificates/all", protect, async (req, res) => {
  try {
    const certs = await Certificate.find({ userId: req.user.id }).sort({ createdAt: -1 });
    return res.json(certs);
  } catch (err) {
    console.error("GET /quiz/certificates/all error:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
});

export default router;
