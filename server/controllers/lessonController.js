// server/controllers/lessonController.js
import Lesson from "../models/lessonModel.js";

// ✅ Add a lesson (YouTube link OR upload)
export const addLesson = async (req, res) => {
  try {
    const { title, type, videoUrl, courseId } = req.body;

    if (!title || !type || !courseId) {
      return res.status(400).json({ message: "Title, type, and courseId are required" });
    }

    let finalVideoUrl = "";

    // If file uploaded → use file path
    if (req.file) {
      finalVideoUrl = `/uploads/${req.file.filename}`;
    }
    // Else if YouTube link provided
    else if (videoUrl) {
      finalVideoUrl = videoUrl;
    } else {
      return res.status(400).json({ message: "Video URL or file required" });
    }

    const lesson = await Lesson.create({
      title,
      type,
      videoUrl: finalVideoUrl,
      courseId,
      uploadedBy: req.user?._id, // optional
    });

    return res.json({ message: "Lesson added successfully", lesson });
  } catch (err) {
    console.error("addLesson error:", err);
    return res.status(500).json({ message: err.message || "Failed to add lesson" });
  }
};

// ✅ Get all lessons (optionally filter by courseId)
export const getLessons = async (req, res) => {
  try {
    const filter = {};
    if (req.query.courseId) {
      filter.courseId = req.query.courseId;
    }

    const lessons = await Lesson.find(filter).populate("uploadedBy", "username email");
    return res.json(lessons);
  } catch (err) {
    console.error("getLessons error:", err);
    return res.status(500).json({ message: err.message || "Failed to fetch lessons" });
  }
};

// ✅ Get single lesson by ID
export const getLessonById = async (req, res) => {
  try {
    const lesson = await Lesson.findById(req.params.id);
    if (!lesson) return res.status(404).json({ message: "Lesson not found" });
    return res.json(lesson);
  } catch (err) {
    console.error("getLessonById error:", err);
    return res.status(500).json({ message: err.message || "Failed to fetch lesson" });
  }
};
