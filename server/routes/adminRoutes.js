// server/routes/adminRoutes.js
import express from "express";
import protect from "../middleware/authMiddleware.js"; // must set req.user
import { getUploaderRequests, approveUploader } from "../controllers/adminController.js";

const router = express.Router();

// GET /api/admin/uploader-requests
router.get("/uploader-requests", protect, getUploaderRequests);

// PUT /api/admin/approve-uploader/:id
router.put("/approve-uploader/:id", protect, approveUploader);

export default router;
