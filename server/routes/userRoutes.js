// server/routes/userRoutes.js
import express from "express";
import protect from "../middleware/authMiddleware.js";
import { imageUpload } from "../uploads/multerConfig.js";
import cloudinary from "../utils/cloudinary.js";
import User from "../models/authModel.js";

const router = express.Router();

// get current user
router.get("/me", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch profile" });
  }
});

// update profile
router.put("/profile", protect, async (req, res) => {
  try {
    const { username, name } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (username) user.username = username;
    if (name) user.name = name;
    await user.save();

    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: "Update failed", error: err.message });
  }
});

// upload avatar
router.post("/avatar", protect, imageUpload.single("avatar"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    // upload to cloudinary (buffer stream)
    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder: "eduoding_avatars",
          resource_type: "image",
          transformation: [{ width: 200, height: 200, crop: "fill" }],
        },
        (err, uploadResult) => {
          if (err) reject(err);
          else resolve(uploadResult);
        }
      ).end(req.file.buffer);
    });

    // save in DB
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.avatarUrl = result.secure_url;
    await user.save();

    res.json({ user, avatarUrl: user.avatarUrl });
  } catch (err) {
    console.error("Avatar upload error:", err);
    res.status(500).json({ message: "Upload failed", error: err.message });
  }
});

export default router;
