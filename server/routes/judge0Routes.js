// server/routes/judge0Routes.js
import express from "express";
import rateLimit from "express-rate-limit";
import judge0Client from "../utils/judge0Client.js";
import { fetchLanguages, resolveLanguageId, LOCAL_MAP } from "../utils/judge0Client.js";

const router = express.Router();

/* ---------------------------------- Languages ---------------------------------- */

// GET /api/judge0/languages
router.get("/languages", async (req, res) => {
  try {
    const langs = await fetchLanguages();
    return res.json(langs);
  } catch (err) {
    console.error("GET /judge0/languages error:", err?.message || err);
    return res.status(500).json({ message: "Failed to fetch languages" });
  }
});

// GET /api/judge0/resolve?name=javascript
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

/* ---------------------------------- Practice Run ---------------------------------- */

const runLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 15,
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

    const jres = await judge0Client.submit(payload, { wait: true, base64: false });

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
