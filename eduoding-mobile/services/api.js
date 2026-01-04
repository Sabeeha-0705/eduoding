// eduoding-mobile/services/api.js
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
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

// Add token to requests
API.interceptors.request.use(async (config) => {
  try {
    const token = await AsyncStorage.getItem("authToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (e) {
    // ignore storage errors
  }
  return config;
});

// Handle 401 errors
API.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err?.response?.status === 401) {
      try {
        await AsyncStorage.removeItem("authToken");
        await AsyncStorage.removeItem("token");
        await AsyncStorage.removeItem("appToken");
      } catch (e) {
        // ignore
      }
    }
    return Promise.reject(err);
  }
);

// Auth helpers
/**
 * Send Google ID token to backend for authentication
 * @param {string} idToken - Google ID token from OAuth flow
 * @returns {Promise} API response with JWT token and user data
 */
export const googleLogin = (token) => {
  return API.post("/auth/google", { token });
};

// Progress helpers
export const toggleLessonProgress = (courseId, lessonId, completed, totalLessons) =>
  API.post(`/progress/${courseId}/lesson`, { lessonId, completed, totalLessons });

export const fetchCourseProgress = (courseId) =>
  API.get(`/progress/${courseId}`);

export const fetchAllProgress = () => API.get("/progress");

// Named and default export
export const api = API;
export default API;

