// client/src/api.js
import axios from "axios";

/**
 * API client
 * - Uses Vite env var VITE_API_BASE if set (e.g. "https://.../api")
 * - Fallback to Render backend URL (includes /api)
 * - Keep timeout and interceptors for auth + centralized error handling
 */

const BASE_URL =
  import.meta.env.VITE_API_BASE ||
  "https://eduoding-backend.onrender.com/api" ||
  "http://localhost:5000/api";

const API = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
});

// Request interceptor: attach token automatically
API.interceptors.request.use(
  (config) => {
    try {
      // Key used by your app (you used "authToken" in code above)
      const token =
        localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
      if (token) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      // ignore storage errors (e.g., SSR)
      console.warn("Failed to read auth token from storage", e);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: normalize errors and handle 401
API.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status;
    const msg =
      err?.response?.data?.message ||
      err?.message ||
      "Something went wrong. Please try again.";

    // On 401, clear tokens and redirect to /auth (only in browser)
    if (status === 401) {
      try {
        localStorage.removeItem("authToken");
        sessionStorage.removeItem("authToken");
      } catch (e) {
        /* ignore */
      }
      if (typeof window !== "undefined") {
        // Prevent going back to protected route
        window.location.replace("/auth");
      }
    }

    const out = new Error(msg);
    out.response = err.response;
    return Promise.reject(out);
  }
);

// keep both default and named export (your code imports default)
export const api = API;
export default API;
