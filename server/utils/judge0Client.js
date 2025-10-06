// server/utils/judge0Langs.js
import axios from "axios";

const JUDGE0_BASE = process.env.JUDGE0_BASE || "https://judge0-ce.p.rapidapi.com";
const JUDGE0_KEY = process.env.JUDGE0_KEY || "";
const JUDGE0_HOST = process.env.JUDGE0_HOST || "";

function judge0Headers() {
  const headers = { "Content-Type": "application/json" };
  if (JUDGE0_KEY) headers["X-RapidAPI-Key"] = JUDGE0_KEY;
  if (JUDGE0_HOST) headers["X-RapidAPI-Host"] = JUDGE0_HOST;
  return headers;
}

let CACHE = null;
let CACHE_AT = 0;
const TTL = 1000 * 60 * 60; // 1 hour

export async function fetchLanguages(force = false) {
  if (!force && CACHE && (Date.now() - CACHE_AT) < TTL) return CACHE;
  try {
    const url = `${JUDGE0_BASE.replace(/\/$/, "")}/languages`;
    const res = await axios.get(url, { headers: judge0Headers(), timeout: 15000 });
    CACHE = Array.isArray(res.data) ? res.data : [];
    CACHE_AT = Date.now();
    return CACHE;
  } catch (err) {
    console.warn("fetchLanguages failed:", err?.message || err);
    return CACHE || [];
  }
}

/**
 * Resolve language name/alias to numeric id.
 * Accepts: numeric string or number, "javascript", "node", "python3", "py"
 */
export async function resolveLanguageId(nameOrId) {
  if (!nameOrId) return null;
  if (typeof nameOrId === "number" || /^\d+$/.test(String(nameOrId))) return Number(nameOrId);
  const langs = await fetchLanguages();
  const needle = String(nameOrId).toLowerCase().trim();

  // direct name match
  let found = langs.find((l) => (l.name || "").toLowerCase() === needle);
  if (found) return Number(found.id || found.language_id || found.languageId);

  // alias match
  found = langs.find((l) => Array.isArray(l.aliases) && l.aliases.map(a => a.toLowerCase()).includes(needle));
  if (found) return Number(found.id || found.language_id || found.languageId);

  // slug or other fields
  found = langs.find((l) => (l.slug || "").toLowerCase() === needle || (l.aliases || []).map(a => a.toLowerCase()).includes(needle));
  if (found) return Number(found.id || found.language_id || found.languageId);

  // contains
  found = langs.find((l) => (l.name || "").toLowerCase().includes(needle) || (l.slug || "").toLowerCase().includes(needle));
  if (found) return Number(found.id || found.language_id || found.languageId);

  return null;
}
