// server/utils/judge0Client.js
// Central Judge0 helper client — default export object with helper methods.
// Provides:
//  - submit(payload, { wait=true, base64=false }) => executes POST /submissions?wait=...
//  - fetchLanguages() => GET /languages (cached)
//  - resolveLanguageId(nameOrId) => resolve name -> numeric id (local map + remote search)

import axios from "axios";

const JUDGE0_BASE = (process.env.JUDGE0_BASE || "https://judge0-ce.p.rapidapi.com").replace(/\/$/, "");
const JUDGE0_KEY = process.env.JUDGE0_KEY || "";
const JUDGE0_HOST = process.env.JUDGE0_HOST || "judge0-ce.p.rapidapi.com";

function headers() {
  const h = { "Content-Type": "application/json" };
  if (JUDGE0_KEY) h["X-RapidAPI-Key"] = JUDGE0_KEY;
  if (JUDGE0_HOST) h["X-RapidAPI-Host"] = JUDGE0_HOST;
  return h;
}

// Local fallback map (common languages -> judge0 ids)
const LOCAL_MAP = {
  javascript: 63, // Node.js
  "node": 63,
  "nodejs": 63,
  "node.js": 63,
  python: 71,     // Python 3
  "python3": 71,
  py: 71,
  java: 62,
  cpp: 54,
  "c++": 54,
  c: 50,
  bash: 46,
  sh: 46,
  shell: 46,
  typescript: 74,
  ts: 74,
};

let _langCache = null;
let _langCacheAt = 0;
const LANG_TTL = 1000 * 60 * 60; // 1 hour

async function fetchLanguages(force = false) {
  if (!force && _langCache && (Date.now() - _langCacheAt) < LANG_TTL) return _langCache;

  try {
    const url = `${JUDGE0_BASE}/languages`;
    const res = await axios.get(url, { headers: headers(), timeout: 15000 });
    const list = Array.isArray(res.data) ? res.data : [];
    _langCache = list.map((l) => ({
      id: l.id ?? l.language_id ?? l.languageId,
      name: l.name ?? l.slug ?? "",
      aliases: l.aliases ?? [],
      raw: l,
    }));
    _langCacheAt = Date.now();
    return _langCache;
  } catch (err) {
    // fallback to local map if remote not reachable
    const fallback = Object.keys(LOCAL_MAP).map((k) => ({ id: LOCAL_MAP[k], name: k }));
    _langCache = fallback;
    _langCacheAt = Date.now();
    return _langCache;
  }
}

async function resolveLanguageId(nameOrId) {
  if (!nameOrId && nameOrId !== 0) return null;
  // numeric
  if (typeof nameOrId === "number" || /^\d+$/.test(String(nameOrId))) return Number(nameOrId);

  const key = String(nameOrId).toLowerCase().trim();
  if (LOCAL_MAP[key]) return LOCAL_MAP[key];
  // try cleaned variant (remove non-alnum)
  const cleaned = key.replace(/[^a-z0-9]/g, "");
  if (LOCAL_MAP[cleaned]) return LOCAL_MAP[cleaned];

  // try remote list
  try {
    const langs = await fetchLanguages();
    // exact name
    let found = langs.find((l) => (l.name || "").toLowerCase() === key);
    if (found) return Number(found.id);
    // alias match
    found = langs.find((l) => Array.isArray(l.aliases) && l.aliases.map(a => a.toLowerCase()).includes(key));
    if (found) return Number(found.id);
    // slug/name includes
    found = langs.find((l) => (l.name || "").toLowerCase().includes(key) || (l.raw?.slug || "").toLowerCase().includes(key));
    if (found) return Number(found.id);
  } catch (err) {
    // ignore
  }
  return null;
}

/**
 * Submit code to Judge0.
 * payload should be an object compatible with Judge0:
 * { source_code, language_id, stdin?, ... }
 *
 * opts:
 *  - wait: boolean (default true) -> uses ?wait=true to get synchronous result
 *  - base64: boolean (default false) -> base64_encoded param
 */
async function submit(payload = {}, opts = { wait: true, base64: false }) {
  const wait = opts.wait !== false;
  const base64 = !!opts.base64;
  const q = [];
  if (wait) q.push("wait=true");
  if (base64) q.push("base64_encoded=true");
  const qs = q.length ? `?${q.join("&")}` : "";
  const url = `${JUDGE0_BASE}/submissions${qs}`;
  try {
    const res = await axios.post(url, payload, { headers: headers(), timeout: 30000 });
    return res.data;
  } catch (err) {
    // return structured error for caller to inspect
    const info = err?.response?.data || err?.response || err?.message || String(err);
    throw new Error("Judge0 submit failed: " + (info?.message || JSON.stringify(info)));
  }
}

export default {
  fetchLanguages,
  resolveLanguageId,
  submit,
  LOCAL_MAP,
};
