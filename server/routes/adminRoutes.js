// server/routes/adminRoutes.js
import express from "express";
import protect from "../middleware/authMiddleware.js";
import {
  getUploaderRequests,
  approveUploader,
  listPendingVideos,
  updateVideoStatus,
} from "../controllers/adminController.js";

const router = express.Router();

// users
router.get("/uploader-requests", protect, getUploaderRequests);
router.put("/approve-uploader/:id", protect, approveUploader);

// videos (admin moderation)
router.get("/videos/pending", protect, listPendingVideos);
router.put("/videos/:id/status", protect, updateVideoStatus);

export default router;
