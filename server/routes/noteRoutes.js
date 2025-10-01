// server/routes/noteRoutes.js
import express from "express";
import Note from "../models/noteModel.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

// Add new note
router.post("/", protect, async (req, res) => {
  try {
    const { content, courseId, lessonId } = req.body;
    if (!content) {
      return res.status(400).json({ message: "Note content is required" });
    }

    const note = new Note({
      userId: req.user._id,
      content,
      courseId,
      lessonId,
    });

    await note.save();
    res.status(201).json(note);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Get all notes for user
router.get("/", protect, async (req, res) => {
  try {
    const notes = await Note.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json(notes);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Delete a note
router.delete("/:id", protect, async (req, res) => {
  try {
    const note = await Note.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!note) {
      return res.status(404).json({ message: "Note not found" });
    }

    res.json({ message: "Note deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

export default router;
