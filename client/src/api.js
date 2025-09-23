// client/src/api.js
import axios from "axios";

/**
 * Prefer Vite env var (set in client .env), fallback to Render backend URL,
 * then local dev fallback. Ensure the backend default includes "/api" if you
 * expect to call endpoints like "/admin/uploader-requests".
 */
const BASE_URL =
  import.meta.env.VITE_API_BASE ||
  "https://eduoding-backend.onrender.com/api" ||
  "http://localhost:5000/api";

const API = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
});

/**
 * Attach token from local/session storage automatically to every request.
 */
API.interceptors.request.use(
  (config) => {
    try {
      const token =
        localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
      if (token) config.headers.Authorization = `Bearer ${token}`;
    } catch (e) {
      // ignore storage access errors
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Centralized response handling:
 * - convert most server responses into a single Error object with message
 * - if 401: clear tokens and redirect to /auth so user can re-login
 */
API.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status;
    const msg =
      err?.response?.data?.message ||
      err?.message ||
      "Something went wrong. Please try again.";

    // If unauthorized, clear local auth and send user to login (helps deployed apps)
    if (status === 401) {
      try {
        localStorage.removeItem("authToken");
        sessionStorage.removeItem("authToken");
      } catch (e) {
        // ignore
      }
      // safe redirect (only in browser)
      if (typeof window !== "undefined") {
        // use replace so back button doesn't go to protected page
        window.location.replace("/auth");
      }
    }

    // Attach response to error object so callers can inspect if needed
    const out = new Error(msg);
    out.response = err.response;
    return Promise.reject(out);
  }
);

// Keep both named and default exports to avoid breakage with different import styles
export const api = API;
export default API;
