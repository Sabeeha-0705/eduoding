import Progress from "../models/progressModel.js";
import Lesson from "../models/lessonModel.js";

// toggle or mark completion for one lesson
export async function updateLessonProgress(req, res) {
  try {
    const { courseId } = req.params;
    const { lessonId, completed } = req.body;
    const userId = req.user.id;

    let doc = await Progress.findOne({ userId, courseId });
    if (!doc) doc = await Progress.create({ userId, courseId });

    let updatedIds = doc.completedLessonIds || [];

    if (completed) {
      if (!updatedIds.includes(String(lessonId)))
        updatedIds.push(String(lessonId));
    } else {
      updatedIds = updatedIds.filter((id) => id !== String(lessonId));
    }

    const totalLessons = await Lesson.countDocuments({ courseId });
    const percent = totalLessons
      ? Math.round((updatedIds.length / totalLessons) * 100)
      : 0;

    doc.completedLessonIds = updatedIds;
    doc.completedPercent = percent;
    await doc.save();

    return res.json({
      courseId,
      completedLessonIds: updatedIds,
      completedPercent: percent,
    });
  } catch (err) {
    console.error("updateLessonProgress error", err);
    return res.status(500).json({ message: "Failed to update progress" });
  }
}

// fetch single course progress
export async function getCourseProgress(req, res) {
  try {
    const { courseId } = req.params;
    const userId = req.user.id;
    const doc = await Progress.findOne({ userId, courseId });
    if (!doc) return res.json({ courseId, completedLessonIds: [], completedPercent: 0 });
    return res.json(doc);
  } catch (err) {
    console.error("getCourseProgress error", err);
    res.status(500).json({ message: "Error fetching progress" });
  }
}
