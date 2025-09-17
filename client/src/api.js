import axios from "axios";

// Prefer environment variable VITE_API_BASE, otherwise use your Render backend URL.
// NOTE: import.meta.env reads Vite env vars that start with VITE_
const BASE_URL =
  import.meta.env.VITE_API_BASE ||
  "https://eduoding-backend.onrender.com/api";

const API = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
});

API.interceptors.request.use(
  (config) => {
    const token =
      localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

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

export const api = API;
export default API;
