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
// NOTE: check your auth middleware export. If it's default export use:
//   import protect from "../middleware/authMiddleware.js";
// If it's a named export use:
import protect from "../middleware/authMiddleware.js"; // <-- most of your code used default import

const router = Router();

// Ensure uploads dir exists (relative to project root)
const uploadsDir = path.join(process.cwd(), "server", "uploads");
fs.mkdirSync(uploadsDir, { recursive: true });

// Multer config — store uploads under server/uploads and keep unique filenames
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

// Accept only common video mime types and limit size (e.g., 1GB here)
const upload = multer({
  storage,
  limits: {
    fileSize: 1024 * 1024 * 1024, // 1GB, adjust as needed
  },
  fileFilter: (req, file, cb) => {
    const allowed = [
      "video/mp4",
      "video/webm",
      "video/quicktime", // mov
      "video/x-matroska", // mkv
      "video/avi",
      "video/x-msvideo",
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Invalid file type. Only video files allowed (mp4, webm, mov, mkv, avi)."
        ),
        false
      );
    }
  },
});

// ✅ Add lesson → YouTube link OR file upload (uploader/admin should POST)
// form-data key for uploaded file: "video"
router.post("/", protect, upload.single("video"), async (req, res, next) => {
  // multer will populate req.file if upload present
  // we forward to controller which expects req.file and req.body
  try {
    await addLesson(req, res);
  } catch (err) {
    next(err);
  }
});

// ✅ Public routes
router.get("/", getLessons);
router.get("/:id", getLessonById);

// Optional: explicit error handler for multer filetype/size issues
router.use((err, req, res, next) => {
  if (err && err instanceof multer.MulterError) {
    // Multer specific errors
    return res.status(400).json({ message: err.message });
  }
  if (err && err.message && err.message.includes("Invalid file type")) {
    return res.status(400).json({ message: err.message });
  }
  // pass on
  next(err);
});

export default router;
