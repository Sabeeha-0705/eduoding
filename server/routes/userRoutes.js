// server/routes/userRoutes.js
import express from "express";
import protect from "../middleware/authMiddleware.js";
import { imageUpload } from "../uploads/multerConfig.js";
import cloudinary from "../utils/cloudinary.js";
import User from "../models/authModel.js";

const router = express.Router();

// helper: remove sensitive fields
function safeUser(userDoc) {
  if (!userDoc) return null;
  const obj = userDoc.toObject ? userDoc.toObject() : { ...userDoc };
  delete obj.password;
  return obj;
}

/**
 * GET /api/users/me
 * return current user's profile (without password)
 */
router.get("/me", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    return res.json(safeUser(user));
  } catch (err) {
    console.error("GET /users/me error:", err);
    return res.status(500).json({ message: "Failed to fetch profile", error: err.message });
  }
});

/**
 * PUT /api/users/profile
 * body: { username, name }
 * updates small profile fields
 */
router.put("/profile", protect, async (req, res) => {
  try {
    const { username, name } = req.body || {};
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // basic validation & trim
    if (typeof username === "string") {
      const u = username.trim();
      if (u.length < 3) return res.status(400).json({ message: "Username must be at least 3 characters." });
      user.username = u;
    }
    if (typeof name === "string") {
      user.name = name.trim();
    }

    await user.save();
    return res.json({ user: safeUser(user) });
  } catch (err) {
    console.error("PUT /users/profile error:", err);
    return res.status(500).json({ message: "Update failed", error: err.message });
  }
});

/**
 * POST /api/users/avatar
 * form-data: avatar (file)
 * uploads to Cloudinary and saves avatarUrl on user
 */
router.post("/avatar", protect, imageUpload.single("avatar"), async (req, res) => {
  try {
    // multer should put file on req.file (memory buffer)
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    // optional: check mime-type header (multer fileFilter should normally do this)
    if (!req.file.mimetype?.startsWith("image/")) {
      return res.status(400).json({ message: "Uploaded file is not an image" });
    }

    // upload to Cloudinary via upload_stream using buffer
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: "eduoding_avatars",
          resource_type: "image",
          transformation: [{ width: 400, height: 400, crop: "fill", gravity: "face" }],
        },
        (err, uploadResult) => {
          if (err) return reject(err);
          resolve(uploadResult);
        }
      );
      stream.end(req.file.buffer);
    });

    if (!result || !result.secure_url) {
      console.error("Cloudinary returned no secure_url:", result);
      return res.status(500).json({ message: "Image upload failed" });
    }

    // persist to DB
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.avatarUrl = result.secure_url;
    await user.save();

    return res.json({ avatarUrl: user.avatarUrl, user: safeUser(user) });
  } catch (err) {
    console.error("POST /users/avatar error:", err);
    return res.status(500).json({ message: "Upload failed", error: err.message });
  }
});

export default router;
