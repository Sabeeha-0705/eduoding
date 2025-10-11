// server/routes/authRoutes.js
import { Router } from "express";
import multer from "multer";
import {
  registerUser,
  loginUser,
  verifyOTP,
  googleLogin,
  forgotPassword,
  resetPassword,
  updateProfile,
} from "../controllers/authController.js";
import protect from "../middleware/authMiddleware.js";

const router = Router();

// 🔹 Auth Routes
router.post("/register", registerUser);
router.post("/verify-otp", verifyOTP);
router.post("/login", loginUser);
router.post("/google", googleLogin);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

// 🔹 Profile Routes (Protected)
router.get("/profile", protect, (req, res) => {
  res.json({ user: req.user });
});

// ✅ Allow users to update name, username, theme, etc.
router.patch("/profile", protect, updateProfile);

// 🔹 Avatar Upload (Protected)
const upload = multer({ dest: "server/uploads/" });
router.post("/avatar", protect, upload.single("avatar"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    // Optionally, save avatar path to user
    req.user.avatar = fileUrl;
    await req.user.save();

    res.json({
      message: "Avatar uploaded successfully",
      avatarUrl: fileUrl,
      user: req.user,
    });
  } catch (err) {
    console.error("Avatar upload error:", err);
    res.status(500).json({ message: "Server error during avatar upload" });
  }
});

export default router;
