// client/src/api/videos.js
import api from "../api";

// Upload file (multipart)
export const uploadVideoFile = (formData, onProgress) =>
  api.post("/videos/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: (evt) => {
      if (onProgress) onProgress(Math.round((evt.loaded * 100) / evt.total));
    },
  });

// Save YouTube URL
export const addYoutubeVideo = (payload) => api.post("/videos/youtube", payload);

// Get my videos
export const getMyVideos = () => api.get("/videos/mine");

// Get single video
export const getVideo = (id) => api.get(`/videos/${id}`);

// Update metadata (approve / edit)
export const updateVideo = (id, data) => api.put(`/videos/${id}`, data);

// Optional: fetch courses (if you have a backend route). If not, the uploader will fallback to static course list in UI.
export const getCourses = () => api.get("/courses/list").catch(() => Promise.resolve({ data: [
  { id: "1", title: "Full Stack Web Development (MERN)" },
  { id: "2", title: "Data Science & AI" },
  { id: "3", title: "Cloud & DevOps" },
  { id: "4", title: "Cybersecurity & Ethical Hacking" },
  { id: "5", title: "UI/UX Design" },
]}));
