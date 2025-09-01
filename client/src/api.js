// src/api.js
import axios from "axios";

export const api = axios.create({
  baseURL: "https://eduoding-backend.onrender.com",
});

// 🔐 Interceptor to attach token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("authToken") || sessionStorage.getItem("authToken");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);
