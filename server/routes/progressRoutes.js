import express from "express";
import Progress from "../models/progressModel.js";
import Lesson from "../models/lessonModel.js"; // 🔥 add this for total lessons count
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

// 🔹 GET all progress for current user
router.get("/", protect, async (req, res) => {
  try {
    const list = await Progress.find({ userId: req.user.id });
    res.json(list);
  } catch (err) {
    console.error("GET /progress error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// 🔹 GET single course progress
router.get("/:courseId", protect, async (req, res) => {
  try {
    const { courseId } = req.params;
    let prog = await Progress.findOne({ userId: req.user.id, courseId });
    if (!prog) {
      prog = { courseId, completedLessonIds: [], completedPercent: 0 };
    }
    res.json(prog);
  } catch (err) {
    console.error("GET /progress/:courseId error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// 🔹 POST overall percent update (optional, not critical)
router.post("/", protect, async (req, res) => {
  try {
    const { courseId, completedPercent } = req.body;
    if (!courseId) return res.status(400).json({ message: "courseId required" });

    const upd = await Progress.findOneAndUpdate(
      { userId: req.user.id, courseId },
      { $set: { completedPercent } },
      { upsert: true, new: true }
    );
    res.json(upd);
  } catch (err) {
    console.error("POST /progress error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// 🔹 POST toggle lesson complete/uncomplete
router.post("/:courseId/lesson", protect, async (req, res) => {
  try {
    const { courseId } = req.params;
    const { lessonId, completed } = req.body;
    if (!lessonId) return res.status(400).json({ message: "lessonId required" });

    let prog = await Progress.findOne({ userId: req.user.id, courseId });
    if (!prog) {
      prog = await Progress.create({
        userId: req.user.id,
        courseId,
        completedLessonIds: [],
        completedPercent: 0,
      });
    }

    const set = new Set(prog.completedLessonIds.map(String));
    if (completed) set.add(String(lessonId));
    else set.delete(String(lessonId));

    const updatedCompleted = Array.from(set);

    // 🔥 Auto calculate percent using Lesson count from DB
    const totalLessons = await Lesson.countDocuments({ courseId });
    const completedPercent = totalLessons
      ? Math.round((updatedCompleted.length / totalLessons) * 100)
      : 0;

    prog.completedLessonIds = updatedCompleted;
    prog.completedPercent = completedPercent;
    await prog.save();

    res.json({
      courseId,
      completedLessonIds: updatedCompleted,
      completedPercent,
    });
  } catch (err) {
    console.error("POST /progress/:courseId/lesson error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
