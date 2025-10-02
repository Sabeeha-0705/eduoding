// server/routes/progressRoutes.js
import express from "express";
import Progress from "../models/progressModel.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

// GET progress for current user (list or for course)
router.get("/", protect, async (req, res) => {
  try {
    const list = await Progress.find({ userId: req.user.id });
    res.json(list);
  } catch (err) {
    console.error("GET /progress error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET progress for a single course for the current user
router.get("/:courseId", protect, async (req, res) => {
  try {
    const { courseId } = req.params; // treat as string
    let prog = await Progress.findOne({ userId: req.user.id, courseId });
    if (!prog) {
      // return empty progress if none
      prog = { courseId, completedLessonIds: [], completedPercent: 0 };
    }
    res.json(prog);
  } catch (err) {
    console.error("GET /progress/:courseId error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// POST update overall progress (create or update)
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

// POST toggle a lesson complete/uncomplete for course
router.post("/:courseId/lesson", protect, async (req, res) => {
  try {
    const { courseId } = req.params; // string
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

    // optional: compute percent if you know total lessons (frontend can pass total)
    let completedPercent = prog.completedPercent;
    if (typeof req.body.totalLessons === "number" && req.body.totalLessons > 0) {
      completedPercent = Math.round((updatedCompleted.length / req.body.totalLessons) * 100);
    }

    prog.completedLessonIds = updatedCompleted;
    prog.completedPercent = completedPercent;
    await prog.save();

    res.json(prog);
  } catch (err) {
    console.error("POST /progress/:courseId/lesson error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
