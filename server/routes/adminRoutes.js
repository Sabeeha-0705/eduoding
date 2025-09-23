// server/routes/adminRoutes.js
import express from "express";
import protect from "../middleware/authMiddleware.js"; // your protect middleware
import User from "../models/authModel.js";

const router = express.Router();

// existing POST /promote route here...
// --------------------------------------------------
// NEW: list users who requested uploader role
// GET  /api/admin/uploader-requests
router.get("/uploader-requests", protect, async (req, res) => {
  try {
    if (req.user.role !== "admin") return res.status(403).json({ message: "Admin only" });
    // return users who asked for uploader but are still 'user'
    const requests = await User.find({ requestedUploader: true, role: "user" }).select("username email createdAt");
    return res.json(requests);
  } catch (err) {
    console.error("get uploader-requests:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// NEW: approve a request (promote the user)
 // PUT /api/admin/approve-uploader/:id
router.put("/approve-uploader/:id", protect, async (req, res) => {
  try {
    if (req.user.role !== "admin") return res.status(403).json({ message: "Admin only" });

    const userId = req.params.id;
    const user = await User.findByIdAndUpdate(
      userId,
      { $set: { role: "uploader", requestedUploader: false } },
      { new: true }
    );
    if (!user) return res.status(404).json({ message: "User not found" });

    return res.json({ message: "Uploader approved", user });
  } catch (err) {
    console.error("approve-uploader:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

export default router;
