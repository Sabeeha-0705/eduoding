// server/utils/judge0Client.js
import axios from "axios";

/*
  judge0Client.js
  - Robust submit + language helpers for Judge0
  - Tries configured JUDGE0_BASE first, then PUBLIC_JUDGE0_BASE fallback when appropriate
*/

const DEFAULT_BASE = "https://judge0-ce.p.rapidapi.com"; // RapidAPI default (use with key)
const PUBLIC_BASE = process.env.PUBLIC_JUDGE0_BASE || "https://ce.judge0.app"; // public instance fallback
// priority: JUDGE0_BASE env -> PUBLIC_JUDGE0_BASE -> DEFAULT_BASE
const JUDGE0_BASE = (process.env.JUDGE0_BASE || PUBLIC_BASE || DEFAULT_BASE).replace(/\/$/, "");
const JUDGE0_KEY = process.env.JUDGE0_KEY || "";
const JUDGE0_HOST = process.env.JUDGE0_HOST || "judge0-ce.p.rapidapi.com";
const IS_RAPIDAPI = JUDGE0_BASE.includes("rapidapi");

/** helper to build headers depending on provider */
function headers() {
  const h = { "Content-Type": "application/json" };
  if (IS_RAPIDAPI) {
    if (JUDGE0_KEY) h["X-RapidAPI-Key"] = JUDGE0_KEY;
    if (JUDGE0_HOST) h["X-RapidAPI-Host"] = JUDGE0_HOST;
  }
  return h;
}

/** Local fallback map for common languages (quick fallback if API unreachable) */
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

/** Fetch Judge0 languages (cached) */
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
    console.warn("⚠️ Judge0 language fetch failed — using fallback map", err?.message || "");
    const fallback = Object.keys(LOCAL_MAP).map((k) => ({ id: LOCAL_MAP[k], name: k }));
    _langCache = fallback;
    _langCacheAt = Date.now();
    return fallback;
  }
}

/** Resolve language id (number or name) */
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
    console.warn("⚠️ Language resolution fallback:", err?.message || "");
  }
  return null;
}

/**
 * Submit payload to Judge0 and wait for result.
 * payload = { source_code, language_id, stdin }
 * opts = { wait: true, base64: false }
 */
export async function submit(payload = {}, opts = { wait: true, base64: false }) {
  const wait = opts.wait !== false;
  const base64 = !!opts.base64;
  const qs = `?wait=${wait}&base64_encoded=${base64}`;
  const primaryUrl = `${JUDGE0_BASE}/submissions${qs}`;

  try {
    const res = await axios.post(primaryUrl, payload, { headers: headers(), timeout: 30000 });
    return res.data;
  } catch (err) {
    const primaryMsg = err?.response?.data?.message || err.message || String(err);
    console.warn("⚠️ Judge0 submit failed (primary):", primaryMsg);

    // If primary looks like RapidAPI, try public fallback once
    if (IS_RAPIDAPI) {
      try {
        const fallbackUrl = `${PUBLIC_BASE}/submissions${qs}`;
        const res2 = await axios.post(fallbackUrl, payload, {
          headers: { "Content-Type": "application/json" },
          timeout: 30000,
        });
        return res2.data;
      } catch (err2) {
        const fallbackMsg = err2?.response?.data?.message || err2.message || String(err2);
        throw new Error("Judge0 submit failed (primary + fallback): " + fallbackMsg);
      }
    }

    // If primary wasn't RapidAPI, no further fallback attempted
    throw new Error("Judge0 submit failed: " + primaryMsg);
  }
}

/** Exports */
export { LOCAL_MAP };
export default { fetchLanguages, resolveLanguageId, submit, LOCAL_MAP };
