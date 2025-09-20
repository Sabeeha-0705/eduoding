// src/api/videos.js
import api from "../api";

// Upload file (multipart)
export const uploadVideoFile = (formData, onProgress) =>
  api.post("/videos/upload", formData, {
    // REMOVE any manual "Content-Type": "multipart/form-data" header here.
    onUploadProgress: (evt) => {
      if (onProgress) onProgress(Math.round((evt.loaded * 100) / evt.total));
    },
  });

// Save YouTube URL
export const addYoutubeVideo = (payload) => api.post("/videos/youtube", payload);

// Get my videos
export const getMyVideos = () => api.get("/videos/mine");

// Get single
export const getVideo = (id) => api.get(`/videos/${id}`);

// Update metadata
export const updateVideo = (id, data) => api.put(`/videos/${id}`, data);
