// server/routes/codeTestRoutes.js
import express from "express";
import { createLimiter, ipKeyGenerator } from "../middleware/rateLimit.js";
import protect from "../middleware/authMiddleware.js";
import CodeSubmission from "../models/codeSubmissionModel.js";
import Quiz from "../models/quizModel.js";
import judge0Client from "../utils/judge0Client.js";
import { addPointsAndBadge, recordQuizResult } from "../utils/rewardSystem.js";
import User from "../models/authModel.js";

const router = express.Router();

/**
 * Per-user rate limiter (fallback to IP if unauthenticated).
 * Uses IPv6-safe keyGenerator to prevent ERR_ERL_KEY_GEN_IPV6 errors on Render.
 * Prefers user ID for authenticated requests, falls back to IP for anonymous.
 */
const codeLimiter = createLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // max submissions per window
  message: { message: "Too many code submissions, try again in a minute." },
  keyGenerator: (req) => {
    try {
      // Use user ID if authenticated, otherwise use IPv6-safe IP extraction
      return req.user?.id ? String(req.user.id) : ipKeyGenerator(req);
    } catch {
      // Fallback to IPv6-safe IP extraction on error
      return ipKeyGenerator(req);
    }
  },
});

/**
 * POST /api/code-test/:courseId/submit
 * Body: { code, language (name or id, optional), questionIndex (optional) }
 *
 * Response: { passed, got, expected, judge0: {...}, submission, awarded }
 */
router.post("/:courseId/submit", protect, codeLimiter, async (req, res) => {
  try {
    const { courseId } = req.params;
    const { code = "", language = null, questionIndex = null } = req.body || {};

    // Basic validation
    if (!code || String(code).trim().length === 0) {
      return res.status(400).json({ message: "No code provided" });
    }

    // find quiz for course
    const quiz = await Quiz.findOne({ courseId: String(courseId) });
    if (!quiz) return res.status(404).json({ message: "Quiz not found for this course" });

    // pick code questions
    const codeQuestions = (Array.isArray(quiz.questions) ? quiz.questions : [])
      .map((q, idx) => ({ ...q, _idx: idx }))
      .filter((q) => q && q.type === "code");

    if (!codeQuestions.length) return res.status(400).json({ message: "No code challenge for this course" });

    // choose question by index safely
    let qIndex = 0;
    if (typeof questionIndex === "number" && Number.isInteger(questionIndex) && questionIndex >= 0 && questionIndex < codeQuestions.length) {
      qIndex = questionIndex;
    }
    const question = codeQuestions[qIndex];

    // Resolve language id (judge0). Try request -> question -> local fallback
    let languageId = null;
    try {
      languageId = await judge0Client.resolveLanguageId(language ?? question.languageId ?? question.language ?? null);
    } catch (e) {
      languageId = question.languageId ?? null;
    }
    if (!languageId) {
      // final attempt via question field
      languageId = await judge0Client.resolveLanguageId(question.languageId ?? null);
    }
    if (!languageId) {
      return res.status(400).json({ message: "Unable to resolve language id for execution" });
    }

    // Prepare payload for Judge0
    const payload = {
      source_code: String(code),
      language_id: Number(languageId),
      stdin: "", // extend if question defines stdin
    };

    // Submit to Judge0 (synchronous/wait)
    let jres;
    try {
      // judge0Client.submit should throw on HTTP errors; catch below
      jres = await judge0Client.submit(payload, { wait: true, base64: false });
    } catch (err) {
      console.warn("Judge0 submit error:", err?.message || err);
      return res.status(502).json({ message: "Judge0 execution failed", error: err?.message || String(err) });
    }

    // Normalize outputs
    const stdoutRaw = String(jres.stdout ?? jres.stdout_raw ?? "").replace(/\r/g, "");
    const got = stdoutRaw.trim();
    const expected = String(question.expectedOutput ?? "").replace(/\r/g, "").trim();
    const passed = got === expected;

    // Save submission (best-effort)
    let submission = null;
    try {
      submission = await CodeSubmission.create({
        userId: req.user.id,
        courseId,
        source: code,
        languageId: Number(languageId),
        languageName: question.language ?? null,
        stdout: got,
        stderr: String(jres.stderr ?? jres.stderr_raw ?? "" ),
        rawResult: jres,
        status: "done",
      });
    } catch (e) {
      console.warn("Failed to save submission:", e?.message || e);
    }

    // Reward logic: award points+badge only on FIRST successful pass
    let awarded = { points: 0, badge: null, firstPass: false };
    if (passed) {
      try {
        const user = await User.findById(req.user.id).lean();
        const userQuizHistory = Array.isArray(user?.quizHistory) ? user.quizHistory : [];

        // Consider "alreadyPassed" if user has a history entry for this course with >= passPercent
        const passPercent = Number(quiz.passPercent ?? 60);
        const alreadyPassed = userQuizHistory.some((h) => String(h.courseId) === String(courseId) && Number(h.score ?? 0) >= passPercent);

        if (!alreadyPassed) {
          const pointsToGive = 25; // tune as desired
          const badgeName = `Code Ace: ${quiz.title ?? `Course ${courseId}`}`;

          // award points + badge
          await addPointsAndBadge(req.user.id, pointsToGive, badgeName);

          // record quiz history with 100 (so future runs won't award again)
          await recordQuizResult(req.user.id, { courseId, score: 100, awardPoints: 0, badge: null });

          awarded = { points: pointsToGive, badge: badgeName, firstPass: true };
        } else {
          awarded = { points: 0, badge: null, firstPass: false };
        }
      } catch (e) {
        console.warn("Reward awarding failed:", e?.message || e);
      }
    }

    // Response
    return res.json({
      passed,
      got,
      expected,
      judge0: {
        status: jres.status ?? jres.status_id ?? null,
        time: jres.time ?? null,
        memory: jres.memory ?? null,
      },
      submission,
      awarded,
    });
  } catch (err) {
    console.error("POST /api/code-test/:courseId/submit error:", err);
    return res.status(500).json({ message: "Server error", error: err?.message || String(err) });
  }
});

export default router;
