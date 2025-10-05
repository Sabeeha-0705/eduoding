// server/utils/judge0Client.js
import axios from "axios";

const JUDGE0_BASE = process.env.JUDGE0_BASE || "https://judge0-ce.p.rapidapi.com";
const JUDGE0_KEY = process.env.JUDGE0_KEY || "";
const JUDGE0_HOST = process.env.JUDGE0_HOST || "";

function buildHeaders() {
  const headers = { "Content-Type": "application/json" };

  // If RapidAPI-style host/key are present, use them
  if (JUDGE0_HOST && JUDGE0_KEY) {
    headers["x-rapidapi-host"] = JUDGE0_HOST;
    headers["x-rapidapi-key"] = JUDGE0_KEY;
  } else if (JUDGE0_KEY) {
    // If only a generic "key" is provided (some hosted Judge0 providers expect Authorization)
    // adapt here if your provider requires a different header name.
    // Example: headers['Authorization'] = `Bearer ${JUDGE0_KEY}`;
    headers["x-judge0-key"] = JUDGE0_KEY; // <-- change if your provider uses another header
  }

  return headers;
}

const judge0 = axios.create({
  baseURL: JUDGE0_BASE,
  headers: buildHeaders(),
  timeout: 20000, // slightly longer for judge runs
});

export default judge0;
