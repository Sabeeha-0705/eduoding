// client/src/api/videos.js
// client/src/api/videos.js
import api from "../api";   // correct path to api.js in parent folder
 // or "../api" — whichever exports your axios instance

export const uploadVideoFile = (formData, onProgress) =>
  api.post("/videos/upload", formData, {
    onUploadProgress: (evt) => {
      if (onProgress) onProgress(Math.round((evt.loaded * 100) / evt.total));
    },
  });

export const addYoutubeVideo = (payload) => api.post("/videos/youtube", payload);
export const getMyVideos = () => api.get("/videos/mine");
export const getVideo = (id) => api.get(`/videos/${id}`);
export const updateVideo = (id, data) => api.put(`/videos/${id}`, data);
