// routes/lessonRoutes.js
import { Router } from "express";
import multer from "multer";
import { addLesson, getLessons, getLessonById } from "../controllers/lessonController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = Router();

// 🔹 Multer config → saves files in uploads/ folder
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });

// 🔹 Add lesson → either YouTube link OR file upload
router.post("/", protect, upload.single("video"), addLesson);

// 🔹 Public routes
router.get("/", getLessons);
router.get("/:id", getLessonById);

export default router;
