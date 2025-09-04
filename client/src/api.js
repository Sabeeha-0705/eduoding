// src/api.js
import axios from "axios";

// Prefer env; fallback to your Render URL; lastly localhost (dev)
const BASE_URL =
  import.meta.env.VITE_API_BASE ||
  "https://eduoding-backend.onrender.com/api" ||
  "http://localhost:5000/api";

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
});

// 🔐 Attach token from localStorage / sessionStorage
api.interceptors.request.use(
  (config) => {
    const token =
      localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// 🔁 Optional: normalize errors
api.interceptors.response.use(
  (res) => res,
  (err) => {
    // You can handle 401 here (e.g., redirect to /login)
    // if (err?.response?.status === 401) { window.location.href = "/login"; }
    const msg =
      err?.response?.data?.message ||
      err?.message ||
      "Something went wrong. Please try again.";
    return Promise.reject(new Error(msg));
  }
);
