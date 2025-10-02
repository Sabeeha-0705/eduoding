// server/routes/userRoutes.js
import express from "express";
import protect from "../middleware/authMiddleware.js";
import User from "../models/authModel.js";
import cloudinary from "../utils/cloudinary.js";
import multer from "multer";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// 🔹 GET current user
router.get("/me", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 🔹 Upload avatar
router.post("/avatar", protect, upload.single("avatar"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    // upload to cloudinary
    const uploadRes = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: "avatars" },
        (err, result) => {
          if (err) reject(err);
          else resolve(result);
        }
      );
      stream.end(req.file.buffer);
    });

    // update user doc
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { avatarUrl: uploadRes.secure_url },
      { new: true }
    ).select("-password");

    res.json({ message: "Avatar updated", user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
