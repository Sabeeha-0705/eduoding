// server/routes/lessonRoutes.js
import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import {
  addLesson,
  getLessons,
  getLessonById,
} from "../controllers/lessonController.js";
// If your auth middleware is exported as `export default protect` keep this import.
// If it's a named export, change accordingly: import { protect } from "../middleware/authMiddleware.js";
import protect from "../middleware/authMiddleware.js";

const router = Router();

// Ensure uploads dir exists (project-root/server/uploads)
const uploadsDir = path.join(process.cwd(), "server", "uploads");
fs.mkdirSync(uploadsDir, { recursive: true });

// Config via env (fallbacks)
const MAX_VIDEO_BYTES = parseInt(process.env.MAX_VIDEO_BYTES || String(1024 * 1024 * 1024), 10); // default 1GB
const ALLOWED_VIDEO_MIMES = (process.env.ALLOWED_VIDEO_MIMES || "video/mp4,video/webm,video/quicktime,video/x-matroska,video/avi,video/x-msvideo")
  .split(",")
  .map((s) => s.trim());

// Multer disk storage: unique filenames
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const safeExt = path.extname(file.originalname) || "";
    const base = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, base + safeExt);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_VIDEO_BYTES,
  },
  fileFilter: (req, file, cb) => {
    if (!file || !file.mimetype) return cb(new Error("Invalid file"), false);
    if (ALLOWED_VIDEO_MIMES.includes(file.mimetype)) {
      return cb(null, true);
    }
    return cb(new Error("Invalid file type. Only video files allowed (mp4, webm, mov, mkv, avi)."), false);
  },
});

// --------------------- Routes ---------------------

// POST /api/lessons
// FormData fields:
// - title (text) [required]
// - type (text) e.g. 'youtube' or 'upload' [required]
// - courseId (text) optional/required based on your flow
// - video (file) optional (if uploading file) — THIS KEY MUST BE "video"
// - videoUrl (text) optional (for youtube links)
router.post("/", protect, upload.single("video"), async (req, res, next) => {
  try {
    // addLesson expects req.file and req.body (title,type,courseId,videoUrl)
    await addLesson(req, res);
  } catch (err) {
    next(err);
  }
});

// Public: get all lessons, optional ?courseId=...
router.get("/", getLessons);

// Public: get single lesson by id
router.get("/:id", getLessonById);

// Multer-specific & friendly error handler
router.use((err, req, res, next) => {
  // Multer errors are instances of multer.MulterError
  if (err && err instanceof multer.MulterError) {
    return res.status(400).json({ message: err.message });
  }
  if (err && err.message && err.message.includes("Invalid file type")) {
    return res.status(400).json({ message: err.message });
  }
  // Other errors: pass along
  return next(err);
});

export default router;
