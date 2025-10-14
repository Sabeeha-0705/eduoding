// server/controllers/lessonController.js
import Lesson from "../models/lessonModel.js";
import { uploadBufferToCloudinary } from "../utils/cloudinary.js"; // optional helper
import fs from "fs";
import path from "path";

/**
 * Add a lesson
 * Accepts:
 * - title (required)
 * - type (required) - "youtube" | "upload" | "text" (depends on your schema)
 * - description (optional)
 * - videoUrl (optional, for youtube/external links)
 * - courseId (optional but recommended if you use courses)
 * - file upload (req.file) -- supports multer memoryStorage or diskStorage
 */
export const addLesson = async (req, res) => {
  try {
    console.log("addLesson called", {
      body: req.body,
      hasFile: !!req.file,
      user: req.user?._id,
    });

    const rawTitle = req.body.title || "";
    const title = String(rawTitle).trim();
    const type = String(req.body.type || "youtube").trim();
    const description = typeof req.body.description !== "undefined" ? String(req.body.description).trim() : "";
    const courseId = typeof req.body.courseId !== "undefined" ? String(req.body.courseId).trim() : undefined;
    const rawVideoUrl = typeof req.body.videoUrl !== "undefined" ? String(req.body.videoUrl).trim() : "";

    // Basic validation
    if (!title) {
      return res.status(400).json({ message: "Title is required" });
    }
    if (!type) {
      return res.status(400).json({ message: "Type is required" });
    }
    // if you require courseId, uncomment next block:
    // if (!courseId) return res.status(400).json({ message: "courseId is required" });

    let finalVideoUrl = "";

    // If a file was uploaded, prefer uploading to Cloudinary (if available) else save locally
    if (req.file) {
      // If multer memoryStorage -> req.file.buffer exists
      if (req.file.buffer && typeof uploadBufferToCloudinary === "function") {
        try {
          const folder = "eduoding/lessons";
          // resource_type can be "video" or "auto" depending on file
          const result = await uploadBufferToCloudinary(req.file.buffer, folder, {
            resource_type: "auto",
          });
          finalVideoUrl = result?.secure_url || result?.url || "";
        } catch (uploadErr) {
          console.warn("Cloudinary upload failed, falling back to local save:", uploadErr);
        }
      }

      // Fallback local save (works for memory buffer and for disk saved file)
      if (!finalVideoUrl) {
        const uploadsDir = path.join(process.cwd(), "server", "uploads");
        fs.mkdirSync(uploadsDir, { recursive: true });

        // sanitize filename
        const safeOriginal = (req.file.originalname || "upload").replace(/\s+/g, "_");
        const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}-${safeOriginal}`;
        const outPath = path.join(uploadsDir, filename);

        if (req.file.buffer) {
          fs.writeFileSync(outPath, req.file.buffer);
        } else if (req.file.path) {
          // if multer.diskStorage already wrote file
          try {
            fs.copyFileSync(req.file.path, outPath);
          } catch (copyErr) {
            console.error("Failed to copy uploaded file to uploads dir:", copyErr);
            return res.status(500).json({ message: "Failed to save uploaded file" });
          }
        } else {
          return res.status(400).json({ message: "Uploaded file missing content" });
        }

        finalVideoUrl = `/uploads/${filename}`;
      }
    } else if (rawVideoUrl) {
      finalVideoUrl = rawVideoUrl;
    } else {
      // If type is "text" or you accept lessons without video, you can allow no videoUrl.
      // For strict video lessons, return error:
      if (type === "upload" || type === "youtube") {
        return res.status(400).json({ message: "Video file or videoUrl required for this lesson type" });
      }
    }

    const newLesson = {
      title,
      type,
      description,
    };

    if (finalVideoUrl) newLesson.videoUrl = finalVideoUrl;
    if (courseId) newLesson.courseId = courseId;
    if (req.user?._id) newLesson.uploadedBy = req.user._id;

    const created = await Lesson.create(newLesson);

    console.log("Lesson created:", created._id);

    return res.status(201).json({ message: "Lesson added successfully", lesson: created });
  } catch (err) {
    console.error("addLesson error:", err);
    return res.status(500).json({ message: err.message || "Failed to add lesson" });
  }
};

/**
 * Get lessons (optional filter by courseId)
 * Query params:
 * - ?courseId=...
 */
export const getLessons = async (req, res) => {
  try {
    const filter = {};
    if (req.query.courseId) filter.courseId = String(req.query.courseId);
    const lessons = await Lesson.find(filter).populate("uploadedBy", "username email");
    return res.json(lessons);
  } catch (err) {
    console.error("getLessons error:", err);
    return res.status(500).json({ message: err.message || "Failed to fetch lessons" });
  }
};

/**
 * Get single lesson by id
 */
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
