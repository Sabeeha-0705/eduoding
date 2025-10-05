// server/routes/codeRoutes.js
import express from "express";
import protect from "../middleware/authMiddleware.js";
import axios from "axios";
import CodeSubmission from "../models/codeSubmissionModel.js";
import judge0 from "../utils/judge0Client.js"; // use the central client


const router = express.Router();

// Judge0 base URL from env
const JUDGE0_BASE = process.env.JUDGE0_BASE || "https://judge0-ce.p.rapidapi.com";
const JUDGE0_KEY = process.env.JUDGE0_KEY || "";
const JUDGE0_HOST = process.env.JUDGE0_HOST || "judge0-ce.p.rapidapi.com"; // 👈 add this

// helper: request headers for Judge0
function judge0Headers() {
  const headers = { "Content-Type": "application/json" };
  if (JUDGE0_KEY) headers["X-RapidAPI-Key"] = JUDGE0_KEY;
  if (JUDGE0_HOST) headers["X-RapidAPI-Host"] = JUDGE0_HOST;
  return headers;
}

// resolveLanguageId (same as before)
async function resolveLanguageId(language) {
  if (!language) return null;
  if (typeof language === "number" || /^\d+$/.test(String(language))) return Number(language);

  try {
    const url = `${JUDGE0_BASE}/languages`;
    const res = await axios.get(url, { headers: judge0Headers(), timeout: 10000 });
    const langs = res.data || [];
    const name = String(language).toLowerCase();

    let found = langs.find((l) => (l.name || "").toLowerCase() === name);
    if (!found) found = langs.find((l) => (l.name || "").toLowerCase().includes(name));
    if (!found) found = langs.find((l) => (l.aliases || []).map((a) => a.toLowerCase()).includes(name));
    if (!found) found = langs.find((l) => (l.slug || "").toLowerCase() === name);

    return found ? Number(found.id || found.language_id || found.languageId) : null;
  } catch (err) {
    console.warn("Failed to fetch /languages from Judge0:", err.message || err);
    return null;
  }
}

// POST /api/code/submit
router.post("/submit", protect, async (req, res) => {
  try {
    const { source, language, stdin = "", courseId, lessonId, title } = req.body || {};
    if (!source) return res.status(400).json({ message: "source is required" });

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

    const languageId = language ? await resolveLanguageId(language) : null;
    if (!languageId) {
      sub.status = "error";
      sub.error = "Unable to resolve language";
      await sub.save();
      return res.status(400).json({ message: "Unable to resolve language. Provide numeric id or supported name." });
    }

    sub.languageId = languageId;
    await sub.save();

    const payload = { source_code: source, language_id: languageId, stdin: stdin || "" };
    const submitUrl = `${JUDGE0_BASE}/submissions?wait=true&base64_encoded=false`;

    const jRes = await axios.post(submitUrl, payload, { headers: judge0Headers(), timeout: 20000 });
    const result = jRes.data || {};

    sub.status = "done";
    sub.rawResult = result;
    sub.stdout = result.stdout || "";
    sub.stderr = result.stderr || "";
    sub.compileOutput = result.compile_output || "";
    sub.time = result.time || "";
    sub.memory = result.memory || "";
    sub.passed = false;
    await sub.save();

    return res.json({ submission: sub, judgeResult: result });
  } catch (err) {
    console.error("POST /api/code/submit error:", err?.response?.data || err.message || err);
    return res.status(500).json({ message: "Submission failed", error: err?.response?.data || err.message });
  }
});

// GET /api/code/:id
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

// GET /api/code/mine/all
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
