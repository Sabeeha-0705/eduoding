// src/api.js
import axios from "axios";

// ✅ Use deployed backend URL + /api
export const api = axios.create({
  baseURL: "https://eduoding-backend.onrender.com/api",
});

// 🔐 Interceptor to attach token
api.interceptors.request.use(
  (config) => {
    const token =
      localStorage.getItem("authToken") || sessionStorage.getItem("authToken");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);
