// server/routes/leaderboardRoutes.js
import express from "express";
import User from "../models/authModel.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

// Public leaderboard (no auth required) - top 100 by points
router.get("/", async (req, res) => {
  try {
    // include avatarUrl so frontend can render user's uploaded avatar
    const users = await User.find({}, "username email points badges role avatarUrl")
      .sort({ points: -1 })
      .limit(100)
      .lean();
    return res.json(users);
  } catch (err) {
    console.error("GET /leaderboard error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// Optional: personal stats (requires auth)
router.get("/me", protect, async (req, res) => {
  try {
    const u = await User.findById(
      req.user.id,
      "username email points badges quizHistory certificates role avatarUrl"
    ).lean();
    if (!u) return res.status(404).json({ message: "User not found" });
    return res.json(u);
  } catch (err) {
    console.error("GET /leaderboard/me error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

export default router;
