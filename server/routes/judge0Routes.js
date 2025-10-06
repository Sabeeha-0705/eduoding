// server/routes/judge0Routes.js
import express from "express";
import { fetchLanguages, resolveLanguageId } from "../utils/judge0Langs.js";

const router = express.Router();

router.get("/languages", async (req, res) => {
  const langs = await fetchLanguages();
  res.json(langs);
});

router.get("/resolve", async (req, res) => {
  const { name } = req.query;
  const id = await resolveLanguageId(name);
  res.json({ name, id });
});

export default router;
