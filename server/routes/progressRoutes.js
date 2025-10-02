// server/routes/progressRoutes.js
import express from "express";
import protect from "../middleware/authMiddleware.js";
import Progress from "../models/progressModel.js";

const router = express.Router();

// Get progress for a course (completed lesson IDs)
router.get("/:courseId", protect, async (req, res) => {
  try {
    const prog = await Progress.findOne({ userId: req.user.id, courseId: req.params.courseId });
    res.json({ completedLessonIds: prog?.completedLessonIds || [] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Toggle mark lesson complete (body: lessonId, completed: true/false)
router.post("/:courseId/lesson", protect, async (req, res) => {
  try {
    const { lessonId, completed } = req.body;
    if (!lessonId) return res.status(400).json({ message: "lessonId required" });

    let prog = await Progress.findOne({ userId: req.user.id, courseId: req.params.courseId });
    if (!prog) {
      prog = await Progress.create({
        userId: req.user.id,
        courseId: req.params.courseId,
        completedLessonIds: [],
      });
    }

    const exists = prog.completedLessonIds.some((id) => String(id) === String(lessonId));

    if (completed && !exists) {
      prog.completedLessonIds.push(lessonId);
    } else if (!completed && exists) {
      prog.completedLessonIds = prog.completedLessonIds.filter((id) => String(id) !== String(lessonId));
    } else {
      // no change
    }

    await prog.save();
    res.json({ completedLessonIds: prog.completedLessonIds });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
