// server/routes/adminRoutes.js
import express from "express";
import protect from "../middleware/authMiddleware.js"; // your protect middleware
import User from "../models/authModel.js";

const router = express.Router();

// POST /api/admin/promote  { email: "user@..." }
// must be called by an existing admin user
router.post("/promote", protect, async (req, res) => {
  try {
    if (req.user.role !== "admin") return res.status(403).json({ message: "Admin only" });
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email required" });

    const result = await User.updateOne({ email }, { $set: { role: "uploader" } });
    return res.json({ message: "User promoted (uploader)", result });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message });
  }
});

export default router;
