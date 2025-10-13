// server/routes/authRoutes.js
import { Router } from "express";
import protect from "../middleware/authMiddleware.js";

// If you created a reusable multer config (memoryStorage) export it:
// import { imageUpload } from "../uploads/multerConfig.js";
// Otherwise we create an in-file memoryStorage uploader below.

import {
  registerUser,
  loginUser,
  verifyOTP,
  googleLogin,
  forgotPassword,
  resetPassword,
  updateProfile,
  uploadAvatarHandler, // controller that handles Cloudinary + fallback
} from "../controllers/authController.js";

const router = Router();

// ----------------- Auth routes -----------------
router.post("/register", registerUser);
router.post("/verify-otp", verifyOTP);
router.post("/login", loginUser);
router.post("/google", googleLogin);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

// ----------------- Profile routes (protected) -----------------
router.get("/profile", protect, (req, res) => {
  try {
    // Normalize to use avatarUrl consistently
    const safeUser = { ...req.user.toObject() };
    delete safeUser.password;
    delete safeUser.otp;
    delete safeUser.otpExpires;

    // keep older key compatibility
    safeUser.avatarUrl = safeUser.avatarUrl || safeUser.avatar || null;

    res.json({ user: safeUser });
  } catch (err) {
    console.error("Profile fetch error:", err);
    res.status(500).json({ message: "Error fetching profile" });
  }
});

// update profile (name, username, theme, etc)
router.patch("/profile", protect, updateProfile);

// ----------------- Avatar upload -----------------
// Use memoryStorage so controller can decide Cloudinary vs local fallback
import multer from "multer";
const memStorage = multer.memoryStorage();
const upload = multer({
  storage: memStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files allowed"), false);
    }
    cb(null, true);
  },
});

// Route: POST /auth/avatar
// - protect ensures req.user exists
// - upload.single puts file buffer on req.file
// - uploadAvatarHandler in controller will handle cloudinary/local save + update user.avatarUrl
router.post("/avatar", protect, upload.single("avatar"), uploadAvatarHandler);

export default router;
