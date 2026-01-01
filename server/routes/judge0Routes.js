// server/routes/judge0Routes.js
import express from "express";
import { createLimiter } from "../middleware/rateLimit.js";
import { fetchLanguages, resolveLanguageId, submit } from "../utils/judge0Client.js";

const router = express.Router();

/* ------------------- LANGUAGES ------------------- */

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

/* ------------------- PRACTICE RUN ------------------- */

/**
 * Rate limiter for code execution (15 runs per minute per IP)
 * Uses IPv6-safe keyGenerator to prevent ERR_ERL_KEY_GEN_IPV6 errors on Render
 */
const runLimiter = createLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 15, // 15 runs per minute per key
  message: { message: "Too many runs — please wait a minute and try again." },
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
    // If DNS (ENOTFOUND) or similar, give a helpful message
    const msg = err?.message || String(err);
    if (msg.includes("ENOTFOUND")) {
      return res.status(502).json({ message: "Judge0 host unreachable (DNS) or wrong base URL" });
    }
    if (msg.toLowerCase().includes("rate") || msg.includes("Too many")) {
      return res.status(429).json({ message: "Judge0 rate limit / quota reached. Try again later." });
    }
    return res.status(500).json({ message: msg });
  }
});

export default router;
