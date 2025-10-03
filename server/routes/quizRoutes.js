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

const router = express.Router();

/** helper: remove correctIndex before sending to client */
function safeQuizForClient(quizDoc) {
  if (!quizDoc) return null;
  const q = quizDoc.toObject ? quizDoc.toObject() : { ...quizDoc };
  if (Array.isArray(q.questions)) {
    q.questions = q.questions.map(({ correctIndex, ...rest }) => rest);
  }
  return q;
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
 * Grade MCQs server-side, generate certificate on pass
 */
router.post("/:courseId/submit", protect, async (req, res) => {
  try {
    const { answers } = req.body || {};
    const quiz = await Quiz.findOne({ courseId: req.params.courseId });
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });

    if (!Array.isArray(quiz.questions) || quiz.questions.length === 0) {
      return res.status(400).json({ message: "Quiz has no questions" });
    }

    const qCount = quiz.questions.length;
    const submitted = Array.isArray(answers) ? answers.slice(0, qCount) : [];
    for (let i = submitted.length; i < qCount; i++) submitted[i] = null;

    const correctAnswers = [];
    let correctCount = 0;
    for (let i = 0; i < qCount; i++) {
      const q = quiz.questions[i];
      const correctIndex = typeof q.correctIndex === "number" ? q.correctIndex : null;
      correctAnswers.push(correctIndex);
      if (submitted[i] !== null && submitted[i] === correctIndex) correctCount++;
    }

    const percent = Math.round((correctCount / qCount) * 100);

    // fail -> return score + correct answers
    if (percent < (quiz.passPercent || 60)) {
      return res.json({
        message: "Failed",
        score: percent,
        correctAnswers,
      });
    }

    // Passed -> build PDF certificate and upload
    const doc = new PDFDocument({ size: "A4", margin: 48 });
    const buffers = [];
    doc.on("data", (b) => buffers.push(b));
    doc.on("error", (err) => {
      console.error("PDFDocument error:", err);
    });

    doc.on("end", async () => {
      try {
        const pdfBuffer = Buffer.concat(buffers);

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

        return res.json({
          message: "Passed",
          score: percent,
          correctAnswers,
          certificate: cert,
        });
      } catch (err) {
        console.error("upload/save certificate error:", err);
        return res.status(500).json({ message: "Failed to upload/save certificate", error: err.message });
      }
    });

    // PDF content (professional layout — logo / signature optional)
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
    const recipient = req.user.username || req.user.name || req.user.email || "Student";
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
 * Body: { code: string, language?: string }
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
      code: code,
      language: language || "javascript",
      result: { status: "saved" },
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
