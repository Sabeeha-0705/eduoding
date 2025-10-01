// server/routes/courseRoutes.js
import express from "express";
import Video from "../models/videoModel.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * GET /api/courses/:id/videos
 * Return approved videos for a given course id
 * If course ids in DB are strings (like "1","2") this will work.
 * If you later change courseId to ObjectId, adjust accordingly.
 */
router.get("/:id/videos", protect, async (req, res) => {
  try {
    const courseId = req.params.id;
    // only approved videos for course
    const videos = await Video.find({ courseId, status: "approved" }).sort({ createdAt: 1 });
    return res.json(videos);
  } catch (err) {
    console.error("GET /courses/:id/videos error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

/**
 * Optional convenience route:
 * GET /api/courses/list
 * Returns static course list (useful for frontend dropdown).
 * Replace with DB-driven Course model later if desired.
 */
router.get("/list", (req, res) => {
  const courses = [
    { id: "1", title: "Full Stack Web Development (MERN)" },
    { id: "2", title: "Data Science & AI" },
    { id: "3", title: "Cloud & DevOps" },
    { id: "4", title: "Cybersecurity & Ethical Hacking" },
    { id: "5", title: "UI/UX Design" },
  ];
  return res.json(courses);
});

export default router;
