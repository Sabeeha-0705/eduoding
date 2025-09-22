// server/routes/videoRoutes.js
import express from "express";
import { upload } from "../uploads/multerConfig.js";
import {
  uploadVideoFile,
  addYoutubeVideo,
  getMyVideos,
  getVideoById,
  updateVideo,
} from "../controllers/videoController.js";
import protect from "../middleware/authMiddleware.js";
import { requireUploader } from "../middleware/roleMiddleware.js";

const router = express.Router();

// Upload file (uploader only)
router.post("/upload", protect, upload.single("video"), uploadVideoFile);


// Add YouTube video
router.post("/youtube", protect, requireUploader, addYoutubeVideo);

// List my uploads
router.get("/mine", protect, requireUploader, getMyVideos);

// Get video by id (public; frontend can check status)
router.get("/:id", getVideoById);

// Update (uploader or admin)
router.put("/:id", protect, updateVideo);

export default router;
