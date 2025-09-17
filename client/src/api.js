// src/api.js
import axios from "axios";

/**
 * Base URL selection priority:
 * 1) VITE_API_BASE (set in Render/Netlify/Vercel environment variables)
 * 2) Render backend (production fallback)
 * 3) localhost (development fallback)
 */
const BASE_URL =
  import.meta.env.VITE_API_BASE ||
  "https://eduoding-backend.onrender.com/api" ||
  "http://localhost:5000/api";

const API = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
});

// Attach JWT token automatically (checks localStorage then sessionStorage)
API.interceptors.request.use(
  (config) => {
    try {
      const token =
        localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
      if (token) config.headers.Authorization = `Bearer ${token}`;
    } catch (e) {
      // ignore if storage not available
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Normalize response errors to friendly Error(message)
API.interceptors.response.use(
  (res) => res,
  (err) => {
    const message =
      err?.response?.data?.message ||
      err?.response?.data?.error ||
      err?.message ||
      "Something went wrong. Please try again.";
    return Promise.reject(new Error(message));
  }
);

// Export default and named export (so existing imports still work)
export const api = API;
export default API;
