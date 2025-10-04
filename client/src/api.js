// client/src/api.js
import axios from "axios";

/**
 * API client
 * - Uses Vite env var VITE_API_BASE if set
 * - Fallback to production Render URL
 * - Final fallback: localhost (dev)
 */

let BASE_URL = import.meta.env.VITE_API_BASE;
if (!BASE_URL) {
  if (import.meta.env.MODE === "development") {
    BASE_URL = "http://localhost:5000/api";
  } else {
    BASE_URL = "https://eduoding-backend.onrender.com/api";
  }
}

const API = axios.create({
  baseURL: BASE_URL,
  timeout: 20000,
});

// Request interceptor → attach token automatically
API.interceptors.request.use(
  (config) => {
    try {
      const token =
        localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
      if (token) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      console.warn("Failed to read auth token", e);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor → normalize errors + handle 401
API.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status;
    const data = err?.response?.data;
    const msg =
      data?.message ||
      err?.message ||
      "Something went wrong. Please try again.";

    if (status === 401) {
      try {
        localStorage.removeItem("authToken");
        sessionStorage.removeItem("authToken");
      } catch (e) {}
      if (typeof window !== "undefined" && !window.__forceLogout) {
        window.__forceLogout = true;
        window.location.replace("/auth");
      }
    }

    const out = new Error(msg);
    out.response = err.response;
    out.data = data;
    return Promise.reject(out);
  }
);

export const api = API; // named export for `import { api } from "./api"`
export default API;     // default export for `import API from "./api"`
