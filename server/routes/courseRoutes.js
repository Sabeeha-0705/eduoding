import express from "express";
import Video from "../models/videoModel.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * GET /api/courses/:id/videos
 * Return approved videos for a given course id
 * If course ids in DB are strings (like "1","2") this will work.
 * If you later change courseId to ObjectId, adjust accordingly.
 */
router.get("/:id/videos", protect, async (req, res) => {
  try {
    const courseId = req.params.id;
    // only approved videos for course
    const videos = await Video.find({ courseId, status: "approved" }).sort({ createdAt: 1 });
    res.json(videos);
  } catch (err) {
    console.error("GET /courses/:id/videos error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
