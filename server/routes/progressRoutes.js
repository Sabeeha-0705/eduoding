// server/routes/progressRoutes.js
import express from "express";
import Progress from "../models/progressModel.js";
import Video from "../models/videoModel.js"; // import your video model
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

// Mark a lesson completed
router.post("/complete", protect, async (req, res) => {
  try {
    const { courseId, lessonId } = req.body;
    if (!courseId || !lessonId) {
      return res.status(400).json({ message: "courseId and lessonId required" });
    }

    let progress = await Progress.findOne({ userId: req.user._id, courseId });
    if (!progress) {
      progress = new Progress({ userId: req.user._id, courseId, completedLessons: [] });
    }

    // Add lesson if not already completed
    if (!progress.completedLessons.includes(lessonId)) {
      progress.completedLessons.push(lessonId);
    }

    // Recalculate %
    const totalLessons = await Video.countDocuments({ courseId, status: "approved" });
    progress.completedPercent = totalLessons
      ? Math.round((progress.completedLessons.length / totalLessons) * 100)
      : 0;

    await progress.save();
    res.json(progress);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Get all progress for user
router.get("/", protect, async (req, res) => {
  try {
    const progress = await Progress.find({ userId: req.user._id });
    res.json(progress);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

export default router;
