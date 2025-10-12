// client/src/api.js
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

// Look for multiple possible token keys (authToken, token, appToken)
API.interceptors.request.use((config) => {
  try {
    const token =
      localStorage.getItem("authToken") ||
      localStorage.getItem("token") ||
      localStorage.getItem("appToken") ||
      sessionStorage.getItem("authToken") ||
      sessionStorage.getItem("token") ||
      sessionStorage.getItem("appToken");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (e) {
    // ignore storage errors
    // console.warn("Token read error", e);
  }
  return config;
});

// response handler: keep existing behaviour plus helpful console
API.interceptors.response.use(
  (res) => res,
  (err) => {
    const msg =
      err?.response?.data?.message || err.message || "Something went wrong";

    // If backend says unauthorized, clear tokens and redirect to auth
    if (err?.response?.status === 401) {
      try {
        localStorage.removeItem("authToken");
        localStorage.removeItem("token");
        localStorage.removeItem("appToken");
        sessionStorage.removeItem("authToken");
        sessionStorage.removeItem("token");
        sessionStorage.removeItem("appToken");
      } catch (e) {}
      if (typeof window !== "undefined" && !window.__forceLogout) {
        window.__forceLogout = true;
        window.location.replace("/auth");
      }
    }

    // attach server message for easier debugging
    // console.error("API error:", err?.response || err);
    return Promise.reject(err);
  }
);

// 🔹 Progress helpers
export const toggleLessonProgress = (courseId, lessonId, completed, totalLessons) =>
  API.post(`/progress/${courseId}/lesson`, { lessonId, completed, totalLessons });

export const fetchCourseProgress = (courseId) =>
  API.get(`/progress/${courseId}`);

export const fetchAllProgress = () => API.get("/progress");

// Named and default export
export const api = API;
export default API;
