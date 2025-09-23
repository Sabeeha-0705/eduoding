// server/routes/adminRoutes.js
import express from "express";
import protect from "../middleware/authMiddleware.js";
import { getUploaderRequests, approveUploader } from "../controllers/adminController.js";

const router = express.Router();

// GET all uploader requests
router.get("/uploader-requests", protect, getUploaderRequests);

// Approve uploader
router.put("/approve-uploader/:id", protect, approveUploader);

export default router;
