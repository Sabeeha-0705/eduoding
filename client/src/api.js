import axios from "axios";

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

API.interceptors.request.use((config) => {
  const token =
    localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

API.interceptors.response.use(
  (res) => res,
  (err) => {
    const msg =
      err?.response?.data?.message || err.message || "Something went wrong";
    if (err?.response?.status === 401) {
      try {
        localStorage.removeItem("authToken");
        sessionStorage.removeItem("authToken");
      } catch (e) {}
      // prevent infinite redirect loops if already redirecting
      if (typeof window !== "undefined" && !window.__forceLogout) {
        window.__forceLogout = true;
        window.location.replace("/auth");
      }
    }
    return Promise.reject(new Error(msg));
  }
);

// Progress helpers (kept for convenience)
export const toggleLessonProgress = (courseId, lessonId, completed) =>
  API.post(`/progress/${courseId}/lesson`, { lessonId, completed });

export const fetchCourseProgress = (courseId) =>
  API.get(`/progress/${courseId}`);

// Backwards-compatible named export
export const api = API;

// Default export
export default API;
