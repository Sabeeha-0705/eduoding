// src/api.js
import axios from "axios";

// Prefer env; fallback to your Render URL; lastly localhost (dev)
const BASE_URL =
  import.meta.env.VITE_API_BASE ||
  "https://eduoding-backend.onrender.com/api" ||
  "http://localhost:5000/api";

const API = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
});

// 🔐 Attach token from localStorage / sessionStorage
API.interceptors.request.use(
  (config) => {
    const token =
      localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// 🔁 Optional: normalize errors
API.interceptors.response.use(
  (res) => res,
  (err) => {
    const msg =
      err?.response?.data?.message ||
      err?.message ||
      "Something went wrong. Please try again.";
    return Promise.reject(new Error(msg));
  }
);

// 👉 support both named + default
export const api = API;
export default API;
