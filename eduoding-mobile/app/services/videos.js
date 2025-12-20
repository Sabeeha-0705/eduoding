// eduoding-mobile/app/services/videos.js
import API from "./api";

export const uploadVideoFile = async (formData, onProgress) => {
  return API.post("/videos/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(percentCompleted);
      }
    },
  });
};

export const addYoutubeVideo = (payload) => API.post("/videos/youtube", payload);

export const getCourses = () => API.get("/courses");

export const getMyVideos = () => API.get("/videos/mine");

