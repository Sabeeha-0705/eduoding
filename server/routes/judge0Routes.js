// server/routes/judge0Routes.js
import express from "express";
import rateLimit from "express-rate-limit";
import { fetchLanguages, resolveLanguageId, submit } from "../utils/judge0Client.js";

const router = express.Router();

/* ---------------------------------- LANGUAGES ---------------------------------- */

// GET /api/judge0/languages → list available languages
router.get("/languages", async (req, res) => {
  try {
    const langs = await fetchLanguages();
    return res.json(langs);
  } catch (err) {
    console.error("GET /judge0/languages error:", err?.message || err);
    return res.status(500).json({ message: "Failed to fetch languages" });
  }
});

// GET /api/judge0/resolve?name=python
router.get("/resolve", async (req, res) => {
  const { name } = req.query;
  try {
    const id = await resolveLanguageId(name);
    return res.json({ name, id });
  } catch (err) {
    console.error("GET /judge0/resolve error:", err?.message || err);
    return res.status(500).json({ message: "Failed to resolve language" });
  }
});

/* ---------------------------------- PRACTICE RUN ---------------------------------- */

const runLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 min window
  max: 15, // 15 runs/minute
  message: { message: "Too many runs — please wait a minute and try again." },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || req.ip,
});

router.post("/run", runLimiter, async (req, res) => {
  try {
    const { code, language } = req.body || {};
    if (!code || !code.trim()) {
      return res.status(400).json({ message: "No code provided" });
    }

    const langId = await resolveLanguageId(language);
    if (!langId) {
      return res.status(400).json({ message: "Unknown or unsupported language" });
    }

    const payload = {
      source_code: code,
      language_id: langId,
      stdin: "",
    };

    // Execute code via Judge0
    const jres = await submit(payload, { wait: true, base64: false });

    const stdout = (jres.stdout || "").replace(/\r/g, "").trim();
    const stderr = (jres.stderr || "").replace(/\r/g, "").trim();
    const time = jres.time || "0.00";
    const memory = jres.memory || 0;

    return res.json({
      success: true,
      language: langId,
      output: stdout || stderr || "(no output)",
      stdout,
      stderr,
      time,
      memory,
    });
  } catch (err) {
    console.error("POST /judge0/run error:", err);
    return res.status(500).json({ message: err?.message || "Execution failed" });
  }
});

export default router;
