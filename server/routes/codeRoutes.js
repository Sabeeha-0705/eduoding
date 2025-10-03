// server/routes/codeRoutes.js
import express from "express";
import protect from "../middleware/authMiddleware.js";
import axios from "axios";
import CodeSubmission from "../models/codeSubmissionModel.js";

const router = express.Router();

// Judge0 base URL from env
const JUDGE0_BASE = process.env.JUDGE0_BASE || "https://judge0-ce.p.rapidapi.com"; // change to your instance
const JUDGE0_KEY = process.env.JUDGE0_KEY || ""; // optional

// helper: request headers for Judge0
function judge0Headers() {
  const headers = { "Content-Type": "application/json" };
  if (JUDGE0_KEY) {
    // common RapidAPI pattern uses 'X-RapidAPI-Key' and 'X-RapidAPI-Host'
    headers["X-RapidAPI-Key"] = JUDGE0_KEY;
    // optional: if you use judge0-ce.p.rapidapi.com, hostname header not needed here
  }
  return headers;
}

/**
 * Helper: resolve language (if language param is number -> use it; if string -> find id via /languages)
 * Accepts language param like 63 (number) OR "python" / "python3" / "javascript"
 */
async function resolveLanguageId(language) {
  if (!language) return null;
  if (typeof language === "number" || /^\d+$/.test(String(language))) {
    return Number(language);
  }

  // string -> fetch /languages once and match best effort
  try {
    const url = `${JUDGE0_BASE}/languages`;
    const res = await axios.get(url, { headers: judge0Headers(), timeout: 10000 });
    const langs = res.data || [];
    const name = String(language).toLowerCase();

    // best-effort match: match by name, or name contains, or alias
    let found = langs.find((l) => (l.name || "").toLowerCase() === name);
    if (!found) found = langs.find((l) => (l.name || "").toLowerCase().includes(name));
    if (!found) found = langs.find((l) => (l.aliases || []).map(a=>a.toLowerCase()).includes(name));
    if (!found) found = langs.find((l) => (l.slug || "").toLowerCase() === name);

    return found ? Number(found.id || found.language_id || found.languge_id || found.languageId) : null;
  } catch (err) {
    console.warn("Failed to fetch /languages from Judge0:", err.message || err);
    return null;
  }
}

/**
 * POST /api/code/submit
 * body: { source, language (id or name), stdin?, courseId?, lessonId?, title? }
 *
 * This endpoint:
 *  - stores a CodeSubmission doc with status=queued
 *  - resolves language id if string given
 *  - posts to Judge0 /submissions?wait=true (so response returned synchronously)
 *  - updates submission with result and returns it
 */
router.post("/submit", protect, async (req, res) => {
  try {
    const { source, language, stdin = "", courseId, lessonId, title } = req.body || {};

    if (!source) return res.status(400).json({ message: "source is required" });

    // create DB entry (queued)
    const sub = await CodeSubmission.create({
      userId: req.user.id,
      courseId: courseId || null,
      lessonId: lessonId || null,
      title: title || "Solution",
      source,
      languageName: typeof language === "string" ? language : null,
      stdin,
      status: "queued",
    });

    // try resolve language id
    let languageId = null;
    if (language) {
      languageId = await resolveLanguageId(language);
    }
    if (!languageId) {
      // if still null, you may choose a default (e.g., JavaScript Node: 63) — but we keep null
      // return helpful error
      // fallback: ask client to provide numeric language id
      return res.status(400).json({ message: "Unable to resolve language. Provide numeric language id or a supported language name." });
    }

    // update doc with languageId
    sub.languageId = languageId;
    await sub.save();

    // prepare payload for Judge0
    const payload = {
      source_code: source,
      language_id: languageId,
      stdin: stdin || "",
    };

    // Use wait=true to get results in response (simple). If your Judge0 doesn't allow wait param, you can POST then poll.
    const submitUrl = `${JUDGE0_BASE}/submissions?wait=true&base64_encoded=false`;

    const jRes = await axios.post(submitUrl, payload, { headers: judge0Headers(), timeout: 20000 });

    // jRes.data contains execution result
    const result = jRes.data || {};

    sub.status = "done";
    sub.rawResult = result;
    sub.stdout = result.stdout || "";
    sub.stderr = result.stderr || "";
    sub.compileOutput = result.compile_output || "";
    sub.time = result.time || "";
    sub.memory = result.memory || "";
    // naive pass detection: if stdout contains expected string you set on client — skip for now
    sub.passed = false;
    await sub.save();

    return res.json({ submission: sub, judgeResult: result });
  } catch (err) {
    console.error("POST /api/code/submit error:", err?.response?.data || err.message || err);
    return res.status(500).json({ message: "Submission failed", error: err?.response?.data || err.message });
  }
});

/**
 * GET /api/code/:id
 * Return a submission record (owner-only)
 */
router.get("/:id", protect, async (req, res) => {
  try {
    const sub = await CodeSubmission.findById(req.params.id);
    if (!sub) return res.status(404).json({ message: "Submission not found" });
    if (String(sub.userId) !== String(req.user.id) && req.user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden" });
    }
    return res.json(sub);
  } catch (err) {
    console.error("GET /api/code/:id error:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
});

/**
 * GET /api/code/mine
 * List current user's submissions
 */
router.get("/mine/all", protect, async (req, res) => {
  try {
    const subs = await CodeSubmission.find({ userId: req.user.id }).sort({ createdAt: -1 }).limit(200);
    return res.json(subs);
  } catch (err) {
    console.error("GET /api/code/mine error:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
});

export default router;
