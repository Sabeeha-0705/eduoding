// server/routes/judge0Routes.js
import express from "express";
import { fetchLanguages, resolveLanguageId, getLanguageId } from "../utils/judge0Langs.js";

const router = express.Router();

// GET /api/judge0/languages  -> returns a list (tries Judge0, falls back to local map)
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
    // if numeric or local map, quick return
    const local = getLanguageId(name);
    if (local) return res.json({ name, id: local, source: "local" });

    const id = await resolveLanguageId(name);
    return res.json({ name, id });
  } catch (err) {
    console.error("GET /judge0/resolve error:", err?.message || err);
    return res.status(500).json({ message: "Failed to resolve language" });
  }
});

export default router;
