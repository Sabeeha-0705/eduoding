// server/routes/lessonRoutes.js
import { Router } from "express";
import multer from "multer";
import path from "path";
import {
  addLesson,
  getLessons,
  getLessonById,
} from "../controllers/lessonController.js";
import { protect } from "../middleware/authMiddleware.js"; // keep named import if your authMiddleware exports that

const router = Router();

// Multer config → saves files in uploads/ folder
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // unique filename
  },
});

const upload = multer({ storage });

// ✅ Add lesson → YouTube link OR file upload (uploader/admin should POST)
router.post("/", protect, upload.single("video"), addLesson);

// ✅ Public routes
router.get("/", getLessons);
router.get("/:id", getLessonById);

export default router;
