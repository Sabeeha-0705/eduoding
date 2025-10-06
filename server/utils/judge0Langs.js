// server/utils/judge0Langs.js
// Helper utilities for Judge0 language ids + optional remote fetch.
// Keeps a small local mapping and also exposes a resolver that can
// optionally fetch /languages from the configured Judge0 CE endpoint.

import axios from "axios";

const LOCAL_MAP = {
  javascript: 63, // Node.js (JavaScript)
  node: 63,
  "node.js": 63,
  python: 71,     // Python 3
  "python3": 71,
  py: 71,
  java: 62,
  c: 50,
  cpp: 54,
  "c++": 54,
  bash: 46,
  shell: 46,
  typescript: 74,
  ts: 74,
};

// Judge0 base URL (from env) - default public CE
const JUDGE0_BASE = process.env.JUDGE0_BASE || "https://judge0-ce.p.rapidapi.com";
const JUDGE0_KEY = process.env.JUDGE0_KEY || "";
const JUDGE0_HOST = process.env.JUDGE0_HOST || "judge0-ce.p.rapidapi.com";

function judge0Headers() {
  const headers = { "Content-Type": "application/json" };
  if (JUDGE0_KEY) headers["X-RapidAPI-Key"] = JUDGE0_KEY;
  if (JUDGE0_HOST) headers["X-RapidAPI-Host"] = JUDGE0_HOST;
  return headers;
}

/**
 * fetchLanguages()
 * - Attempts to GET /languages from Judge0 (if reachable)
 * - Falls back to returning LOCAL_MAP entries as array of { name, id }
 */
export async function fetchLanguages() {
  try {
    const url = `${JUDGE0_BASE.replace(/\/$/, "")}/languages`;
    const res = await axios.get(url, { headers: judge0Headers(), timeout: 10000 });
    const data = Array.isArray(res.data) ? res.data : [];
    // normalize to { id, name, aliases? }
    return data.map((d) => ({
      id: d.id ?? d.language_id ?? d.languageId,
      name: d.name ?? d.slug ?? "",
      aliases: d.aliases ?? [],
      raw: d,
    }));
  } catch (err) {
    // fallback: return local map as array
    return Object.keys(LOCAL_MAP).map((k) => ({ id: LOCAL_MAP[k], name: k }));
  }
}

/**
 * getLanguageId(nameOrId)
 * - If numeric or numeric-string -> returns Number
 * - If known key in LOCAL_MAP -> return numeric id
 * - else null
 */
export function getLanguageId(nameOrId) {
  if (!nameOrId && nameOrId !== 0) return null;
  if (typeof nameOrId === "number" || /^\d+$/.test(String(nameOrId))) {
    return Number(nameOrId);
  }
  const key = String(nameOrId).toLowerCase().trim();
  if (LOCAL_MAP[key]) return LOCAL_MAP[key];
  // try to match when name contains spaces or punctuation (e.g. "C++" => cpp)
  const cleaned = key.replace(/[^a-z0-9]/g, "");
  if (LOCAL_MAP[cleaned]) return LOCAL_MAP[cleaned];
  return null;
}

/**
 * resolveLanguageId(name)
 * - Try local mapping first
 * - Then try fetching /languages from Judge0 and match by name/slug/aliases
 */
export async function resolveLanguageId(name) {
  if (!name) return null;

  // numeric already?
  const maybeNum = getLanguageId(name);
  if (maybeNum) return maybeNum;

  // try fetching remote languages
  try {
    const list = await fetchLanguages();
    const lname = String(name).toLowerCase();
    // try exact name/slug
    let found = list.find((l) => (l.name || "").toLowerCase() === lname);
    if (!found) {
      // try id fields
      found = list.find((l) => String(l.id) === String(name));
    }
    if (!found) {
      // try aliases or name includes
      found = list.find((l) => ((l.aliases || []).map((a) => a.toLowerCase()).includes(lname)));
    }
    if (!found) {
      found = list.find((l) => (l.name || "").toLowerCase().includes(lname));
    }
    return found ? Number(found.id) : null;
  } catch (err) {
    return null;
  }
}

export default {
  LOCAL_MAP,
  fetchLanguages,
  getLanguageId,
  resolveLanguageId,
};
