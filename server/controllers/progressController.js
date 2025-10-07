// server/controllers/progressController.js
import Progress from "../models/Progress.js";
import Video from "../models/Video.js"; // or Lesson if you use that model

export const updateLessonProgress = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { lessonId, completed, totalLessons } = req.body;
    const userId = req.user.id;

    // Find or create progress record for this user & course
    let progress = await Progress.findOne({ userId, courseId });
    if (!progress) {
      progress = new Progress({
        userId,
        courseId,
        completedLessonIds: [],
        completedPercent: 0,
      });
    }

    // Update completed lesson list
    const lessonSet = new Set(progress.completedLessonIds.map(String));
    if (completed) lessonSet.add(String(lessonId));
    else lessonSet.delete(String(lessonId));
    progress.completedLessonIds = Array.from(lessonSet);

    // Calculate completion percent
    let total = totalLessons;
    if (!total || total <= 0) {
      // fallback: get total from database if not provided
      total = await Video.countDocuments({ courseId });
    }

    const completedCount = progress.completedLessonIds.length;
    progress.completedPercent = total > 0 ? Math.round((completedCount / total) * 100) : 0;

    await progress.save();

    res.json({
      success: true,
      message: "Progress updated",
      completedLessonIds: progress.completedLessonIds,
      completedPercent: progress.completedPercent,
    });
  } catch (err) {
    console.error("updateLessonProgress error:", err);
    res.status(500).json({ message: "Failed to update progress" });
  }
};
