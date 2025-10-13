// server/controllers/lessonController.js
import Lesson from "../models/lessonModel.js";
import { uploadBufferToCloudinary } from "../utils/cloudinary.js"; // optional
import fs from "fs";
import path from "path";

export const addLesson = async (req, res) => {
  try {
    // Logging to help debug empty collection
    console.log("addLesson hit. req.body:", req.body, "hasFile:", !!req.file, "user:", req.user?._id);

    const { title: rawTitle, type, videoUrl: rawVideoUrl, courseId } = req.body;
    const title = (rawTitle || "").trim();
    const course = (courseId || "").trim();

    if (!title || !type || !course) {
      return res.status(400).json({ message: "Title, type and courseId are required" });
    }

    let finalVideoUrl = "";

    // If file uploaded (multer memoryStorage or disk)
    if (req.file) {
      // If you use Cloudinary helper (buffer)
      if (typeof uploadBufferToCloudinary === "function" && req.file.buffer) {
        try {
          const folder = "eduoding/lessons";
          const result = await uploadBufferToCloudinary(req.file.buffer, folder, {
            resource_type: "video", // if you upload video
          });
          finalVideoUrl = result.secure_url || result.url;
        } catch (uploadErr) {
          console.error("Cloudinary upload failed:", uploadErr);
          // fallback to local write below
        }
      }

      // fallback: save to local server uploads dir (if buffer present)
      if (!finalVideoUrl) {
        const uploadsDir = path.join(process.cwd(), "server", "uploads");
        fs.mkdirSync(uploadsDir, { recursive: true });
        const filename = `${Date.now()}-${req.file.originalname.replace(/\s+/g, "_")}`;
        const outPath = path.join(uploadsDir, filename);
        if (req.file.buffer) {
          fs.writeFileSync(outPath, req.file.buffer);
        } else if (req.file.path) {
          // multer diskStorage already saved it, use that path
          fs.copyFileSync(req.file.path, outPath);
        }
        finalVideoUrl = `/uploads/${filename}`;
      }
    } else if (rawVideoUrl) {
      finalVideoUrl = rawVideoUrl.trim();
    } else {
      return res.status(400).json({ message: "Video file or videoUrl required" });
    }

    // create lesson
    const lesson = await Lesson.create({
      title,
      type,
      videoUrl: finalVideoUrl,
      courseId: course,
      uploadedBy: req.user?._id || null,
    });

    console.log("Lesson created:", lesson._id);

    return res.status(201).json({ message: "Lesson added successfully", lesson });
  } catch (err) {
    console.error("addLesson error:", err);
    return res.status(500).json({ message: err.message || "Failed to add lesson" });
  }
};

export const getLessons = async (req, res) => {
  try {
    const filter = {};
    if (req.query.courseId) filter.courseId = req.query.courseId;
    const lessons = await Lesson.find(filter).populate("uploadedBy", "username email");
    return res.json(lessons);
  } catch (err) {
    console.error("getLessons error:", err);
    return res.status(500).json({ message: err.message || "Failed to fetch lessons" });
  }
};

export const getLessonById = async (req, res) => {
  try {
    const lesson = await Lesson.findById(req.params.id).populate("uploadedBy", "username email");
    if (!lesson) return res.status(404).json({ message: "Lesson not found" });
    return res.json(lesson);
  } catch (err) {
    console.error("getLessonById error:", err);
    return res.status(500).json({ message: err.message || "Failed to fetch lesson" });
  }
};
