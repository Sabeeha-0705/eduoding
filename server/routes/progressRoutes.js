// server/routes/progressRoutes.js
import express from "express";
import Progress from "../models/progressModel.js";
import Lesson from "../models/lessonModel.js"; // may be empty in some installs
import Video from "../models/videoModel.js"; // fallback if you store lessons as videos
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * GET /api/progress
 * Return all progress records for current user
 */
router.get("/", protect, async (req, res) => {
  try {
    const list = await Progress.find({ userId: req.user.id }).sort({ updatedAt: -1 });
    return res.json(list);
  } catch (err) {
    console.error("GET /progress error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

/**
 * GET /api/progress/:courseId
 * Return single course progress for current user (or default structure)
 */
router.get("/:courseId", protect, async (req, res) => {
  try {
    const { courseId } = req.params;
    let prog = await Progress.findOne({ userId: req.user.id, courseId });
    if (!prog) {
      prog = {
        courseId,
        completedLessonIds: [],
        completedPercent: 0,
      };
    }
    return res.json(prog);
  } catch (err) {
    console.error("GET /progress/:courseId error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

/**
 * POST /api/progress
 * Optional: directly set completedPercent (admin / sync use)
 * Body: { courseId, completedPercent }
 */
router.post("/", protect, async (req, res) => {
  try {
    const { courseId, completedPercent } = req.body;
    if (!courseId) return res.status(400).json({ message: "courseId required" });

    const upd = await Progress.findOneAndUpdate(
      { userId: req.user.id, courseId },
      { $set: { completedPercent: Number(completedPercent) || 0 } },
      { upsert: true, new: true }
    );

    return res.json(upd);
  } catch (err) {
    console.error("POST /progress error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

/**
 * POST /api/progress/:courseId/lesson
 * Toggle lesson completion and compute percent.
 * Body: { lessonId, completed: boolean, totalLessons?: number }
 */
router.post("/:courseId/lesson", protect, async (req, res) => {
  try {
    const { courseId } = req.params;
    const { lessonId, completed } = req.body;
    if (!lessonId) return res.status(400).json({ message: "lessonId required" });

    // find or create progress doc
    let prog = await Progress.findOne({ userId: req.user.id, courseId });
    if (!prog) {
      prog = await Progress.create({
        userId: req.user.id,
        courseId,
        completedLessonIds: [],
        completedPercent: 0,
      });
    }

    // update set of completed IDs
    const set = new Set((prog.completedLessonIds || []).map((id) => String(id)));
    if (completed) set.add(String(lessonId));
    else set.delete(String(lessonId));
    const updatedCompleted = Array.from(set);

    // determine total lessons:
    // 1) try real Lesson model count
    // 2) if not present/0, try Video model
    // 3) fallback to req.body.totalLessons or 0
    let totalLessons = 0;
    try {
      if (Lesson && typeof Lesson.countDocuments === "function") {
        totalLessons = await Lesson.countDocuments({ courseId });
      }
    } catch (e) {
      console.warn("Lesson count error (ignored):", e.message || e);
      totalLessons = 0;
    }

    if (!totalLessons && Video && typeof Video.countDocuments === "function") {
      try {
        totalLessons = await Video.countDocuments({ courseId });
      } catch (e) {
        console.warn("Video count error (ignored):", e.message || e);
      }
    }

    if (!totalLessons) {
      const fallback = Number(req.body.totalLessons) || 0;
      totalLessons = fallback;
    }

    const completedPercent = totalLessons > 0
      ? Math.round((updatedCompleted.length / totalLessons) * 100)
      : 0;

    // Save progress
    prog.completedLessonIds = updatedCompleted;
    prog.completedPercent = completedPercent;
    await prog.save();

    console.log(
      `Progress update: user=${req.user.id} course=${courseId} ${updatedCompleted.length}/${totalLessons} -> ${completedPercent}%`
    );

    // Cleanup: delete progress if nothing completed
    if (updatedCompleted.length === 0) {
      try {
        await Progress.deleteOne({ userId: req.user.id, courseId });
        console.log(`🧹 Deleted empty progress record for course ${courseId}`);
        return res.json({
          courseId,
          completedLessonIds: [],
          completedPercent: 0,
        });
      } catch (delErr) {
        console.warn("Failed to delete empty progress doc:", delErr);
        // fall through and still return current data (which is empty)
        return res.json({
          courseId,
          completedLessonIds: [],
          completedPercent: 0,
        });
      }
    }

    // Normal response when there are completed lessons
    return res.json({
      courseId,
      completedLessonIds: updatedCompleted,
      completedPercent,
    });
  } catch (err) {
    console.error("POST /progress/:courseId/lesson error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

export default router;
