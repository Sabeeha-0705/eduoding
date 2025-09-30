import express from "express";
import Progress from "../models/progressModel.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// ✅ Save or update progress
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { courseId, completedPercent } = req.body;

    if (!courseId) {
      return res.status(400).json({ message: "Course ID is required" });
    }

    let progress = await Progress.findOne({ userId: req.user.id, courseId });

    if (progress) {
      progress.completedPercent = completedPercent;
    } else {
      progress = new Progress({
        userId: req.user.id,
        courseId,
        completedPercent,
      });
    }

    await progress.save();
    res.json(progress);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ✅ Get all progress for user
router.get("/", authMiddleware, async (req, res) => {
  try {
    const progress = await Progress.find({ userId: req.user.id });
    res.json(progress);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

export default router;
