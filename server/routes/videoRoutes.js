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
router.post("/upload", protect, requireUploader, upload.single("video"), uploadVideoFile);

// Add YouTube video (uploader only)
router.post("/youtube", protect, requireUploader, addYoutubeVideo);

// List my uploads
router.get("/mine", protect, requireUploader, getMyVideos);

// Get video by id (public)
router.get("/:id", getVideoById);

// Update (uploader or admin)
router.put("/:id", protect, updateVideo);

export default router;
