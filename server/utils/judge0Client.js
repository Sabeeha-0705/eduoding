// server/utils/judge0Client.js
import axios from "axios";

/*
  This utility sends code submissions to Judge0 for execution.
  It supports both RapidAPI-hosted Judge0 and self-hosted (public) Judge0 APIs.
*/

const DEFAULT_BASE = "https://judge0-ce.p.rapidapi.com"; // RapidAPI default
const PUBLIC_BASE = "https://judge0-ce.p.rapidapi.com";  // can change to free Judge0 public if needed
const JUDGE0_BASE = (process.env.JUDGE0_BASE || DEFAULT_BASE).replace(/\/$/, "");
const JUDGE0_KEY = process.env.JUDGE0_KEY || "";
const JUDGE0_HOST = process.env.JUDGE0_HOST || "judge0-ce.p.rapidapi.com";

const IS_RAPIDAPI = JUDGE0_BASE.includes("rapidapi");

/**
 * Header helper for both RapidAPI and non-RapidAPI usage
 */
function headers() {
  const h = { "Content-Type": "application/json" };
  if (IS_RAPIDAPI) {
    if (JUDGE0_KEY) h["X-RapidAPI-Key"] = JUDGE0_KEY;
    if (JUDGE0_HOST) h["X-RapidAPI-Host"] = JUDGE0_HOST;
  }
  return h;
}

/**
 * Local fallback language map for common Judge0 IDs
 */
const LOCAL_MAP = {
  javascript: 63, node: 63, "node.js": 63,
  python: 71, python3: 71,
  java: 62,
  cpp: 54, "c++": 54,
  c: 50,
  bash: 46, sh: 46,
  typescript: 74,
};

let _langCache = null;
let _langCacheAt = 0;
const LANG_TTL = 1000 * 60 * 60; // 1 hour cache

/**
 * Fetch Judge0 language list (cached)
 */
export async function fetchLanguages(force = false) {
  if (!force && _langCache && (Date.now() - _langCacheAt) < LANG_TTL) return _langCache;
  try {
    const url = `${JUDGE0_BASE}/languages`;
    const res = await axios.get(url, { headers: headers(), timeout: 15000 });
    _langCache = (res.data || []).map((l) => ({
      id: l.id ?? l.language_id,
      name: l.name ?? "",
      aliases: l.aliases ?? [],
      raw: l,
    }));
    _langCacheAt = Date.now();
    return _langCache;
  } catch (err) {
    console.warn("⚠️ Judge0 language fetch failed, using fallback map");
    const fallback = Object.keys(LOCAL_MAP).map((k) => ({ id: LOCAL_MAP[k], name: k }));
    _langCache = fallback;
    _langCacheAt = Date.now();
    return fallback;
  }
}

/**
 * Resolve numeric Judge0 language_id from a language name or alias.
 */
export async function resolveLanguageId(nameOrId) {
  if (!nameOrId) return null;
  if (typeof nameOrId === "number" || /^\d+$/.test(String(nameOrId))) return Number(nameOrId);

  const key = String(nameOrId).toLowerCase().trim();
  if (LOCAL_MAP[key]) return LOCAL_MAP[key];

  try {
    const langs = await fetchLanguages();
    const found = langs.find((l) => (l.name || "").toLowerCase().includes(key));
    if (found) return Number(found.id);
  } catch (err) {
    console.warn("Language resolution fallback:", err?.message);
  }
  return null;
}

/**
 * Submit code to Judge0 and wait for the result.
 * payload = { source_code, language_id, stdin }
 * opts = { wait: true, base64: false }
 */
export async function submit(payload = {}, opts = { wait: true, base64: false }) {
  const wait = opts.wait !== false;
  const base64 = !!opts.base64;
  const qs = `?wait=${wait}&base64_encoded=${base64}`;
  const url = `${JUDGE0_BASE}/submissions${qs}`;

  try {
    const res = await axios.post(url, payload, { headers: headers(), timeout: 30000 });
    return res.data;
  } catch (err) {
    // 🧠 Try again once with public Judge0 fallback if RapidAPI fails
    const msg = err?.response?.data?.message || err.message || "Unknown error";
    console.warn("⚠️ Judge0 submit failed:", msg);

    if (IS_RAPIDAPI) {
      try {
        const fallbackURL = `${PUBLIC_BASE}/submissions${qs}`;
        const res2 = await axios.post(fallbackURL, payload, {
          headers: { "Content-Type": "application/json" },
          timeout: 30000,
        });
        return res2.data;
      } catch (err2) {
        throw new Error("Judge0 submit failed (both APIs): " + (err2?.response?.data?.message || err2.message));
      }
    }

    throw new Error("Judge0 submit failed: " + msg);
  }
}

// ✅ Make sure this part is added
export { fetchLanguages, resolveLanguageId, submit, LOCAL_MAP };
export default { fetchLanguages, resolveLanguageId, submit, LOCAL_MAP };
