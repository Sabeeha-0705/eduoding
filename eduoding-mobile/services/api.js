// eduoding-mobile/services/api.js
import axios from "axios";
import { API_BASE } from "../constants/config";

let BASE_URL = API_BASE;
if (!BASE_URL) {
  BASE_URL = "https://eduoding-backend.onrender.com/api";
} else if (!BASE_URL.endsWith("/api")) {
  // Add /api if not present, but handle trailing slash
  BASE_URL = BASE_URL.endsWith("/") ? `${BASE_URL}api` : `${BASE_URL}/api`;
}

const API = axios.create({
  baseURL: BASE_URL,
  timeout: 20000,
});

// No auth token is attached in mobile - requests are read-only for now
// We intentionally avoid reading AsyncStorage for authToken to keep the app auth-free.

// No special response handling for 401; failures will be surfaced to callers.

// (Google login removed for temporary no-auth mode)

// Progress helpers
export const toggleLessonProgress = (
  courseId,
  lessonId,
  completed,
  totalLessons
) =>
  API.post(`/progress/${courseId}/lesson`, {
    lessonId,
    completed,
    totalLessons,
  });

export const fetchCourseProgress = (courseId) =>
  API.get(`/progress/${courseId}`);

export const fetchAllProgress = () => API.get("/progress");

// Named and default export
export const api = API;
export default API;
