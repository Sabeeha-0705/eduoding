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
  try {
    const safeUser = { ...req.user.toObject() };
    delete safeUser.password;
    delete safeUser.otp;
    delete safeUser.otpExpires;
    res.json({ user: safeUser });
  } catch (err) {
    console.error("Profile fetch error:", err);
    res.status(500).json({ message: "Error fetching profile" });
  }
});

// ✅ Update name, username, theme, etc.
router.patch("/profile", protect, updateProfile);

// 🔹 Avatar Upload (Protected)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "server/uploads/");
  },
  filename: function (req, file, cb) {
    // Prevent collisions by adding timestamp
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files allowed"), false);
    }
    cb(null, true);
  },
});

// 🔹 Upload Avatar
router.post("/avatar", protect, upload.single("avatar"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    req.user.avatar = fileUrl;
    await req.user.save();

    const safeUser = req.user.toObject();
    delete safeUser.password;
    delete safeUser.otp;
    delete safeUser.otpExpires;

    res.json({
      message: "Avatar uploaded successfully",
      avatarUrl: fileUrl,
      user: safeUser,
    });
  } catch (err) {
    console.error("Avatar upload error:", err);
    res.status(500).json({ message: "Server error during avatar upload" });
  }
});

export default router;
