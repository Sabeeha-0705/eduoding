// server/routes/userRoutes.js
import express from "express";
import protect from "../middleware/authMiddleware.js";
import User from "../models/authModel.js"; // your user model name (adjust import)

const router = express.Router();

// get current user (optional)
router.get("/me", protect, async (req, res) => {
  const user = await User.findById(req.user.id).select("-password");
  res.json(user);
});

// update profile: body { username, name }
router.put("/profile", protect, async (req, res) => {
  try {
    const { username, name } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (username) user.username = username;
    if (name) user.name = name;
    await user.save();
    const safe = user.toObject();
    delete safe.password;
    res.json({ message: "Profile updated", user: safe });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
