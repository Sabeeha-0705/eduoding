// routes/authRoutes.js  (or server/routes/authRoutes.js depending your tree)
import { Router } from "express";
import {
  registerUser,
  loginUser,
  verifyOTP,
  googleLogin,
  forgotPassword,
  resetPassword,
} from "../controllers/authController.js";
// use named import (protect) — middleware now exports named & default
import { protect } from "../middleware/authMiddleware.js";

const router = Router();

// 🔹 Auth Routes
router.post("/register", registerUser);
router.post("/verify-otp", verifyOTP);
router.post("/login", loginUser);
router.post("/google", googleLogin);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

// 🔹 Protected Profile Route
router.get("/profile", protect, (req, res) => {
  res.json({ user: req.user });
});

export default router;
