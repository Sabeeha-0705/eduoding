// controllers/lessonController.js
import Lesson from "../models/lessonModel.js";

export const addLesson = async (req, res) => {
  try {
    const { title, type, videoUrl, courseId } = req.body;

    if (!title || !type || !courseId) {
      return res.status(400).json({ message: "Title, type and courseId required" });
    }

    let finalVideoUrl = videoUrl;

    // If file uploaded
    if (req.file) {
      finalVideoUrl = `/uploads/${req.file.filename}`;
    }

    const lesson = await Lesson.create({
      title,
      type,
      videoUrl: finalVideoUrl,
      courseId,
      uploadedBy: req.user._id,
    });

    res.json({ message: "Lesson added successfully", lesson });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getLessons = async (req, res) => {
  try {
    const filter = {};
    if (req.query.courseId) {
      filter.courseId = req.query.courseId;
    }

    const lessons = await Lesson.find(filter).populate("uploadedBy", "username email");
    res.json(lessons);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// 🔹 Get single lesson
export const getLessonById = async (req, res) => {
  try {
    const lesson = await Lesson.findById(req.params.id);
    if (!lesson) return res.status(404).json({ message: "Lesson not found" });

    res.json(lesson);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
