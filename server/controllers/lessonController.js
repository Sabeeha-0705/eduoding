import Lesson from "../models/lessonModel.js";

// ✅ Add a lesson (YouTube link OR upload)
export const addLesson = async (req, res) => {
  try {
    const { title, type, videoUrl, courseId } = req.body;

    if (!title || !type || !courseId) {
      return res
        .status(400)
        .json({ message: "Title, type, and courseId are required" });
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

    res.json({ message: "Lesson added successfully", lesson });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ Get all lessons (optionally filter by courseId)
export const getLessons = async (req, res) => {
  try {
    const filter = {};
    if (req.query.courseId) {
      filter.courseId = req.query.courseId;
    }

    const lessons = await Lesson.find(filter).populate(
      "uploadedBy",
      "username email"
    );

    res.json(lessons);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ Get single lesson by ID
export const getLessonById = async (req, res) => {
  try {
    const lesson = await Lesson.findById(req.params.id);
    if (!lesson) return res.status(404).json({ message: "Lesson not found" });

    res.json(lesson);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
