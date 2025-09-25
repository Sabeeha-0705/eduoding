// server/controllers/adminController.js
import User from "../models/authModel.js";
import Video from "../models/videoModel.js"; // adjust path/name to your video model

/**
 * GET /api/admin/uploader-requests
 */
export const getUploaderRequests = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin only" });
    }
    const requests = await User.find({
      requestedUploader: true,
      role: "user",
    }).select("username email requestedUploader createdAt");
    return res.json(requests);
  } catch (err) {
    console.error("getUploaderRequests:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * PUT /api/admin/approve-uploader/:id
 * Promote a user to role 'uploader' and clear requestedUploader flag
 * Optional: if you *want* to set requestedUploader true at same time (not typical),
 * you can toggle that here (commented).
 */
export const approveUploader = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin only" });
    }

    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.role = "uploader";
    user.requestedUploader = false; // typical: clear the request because admin approved

    // ---- optional: if you want to mark requestedUploader = true automatically:
    // user.requestedUploader = true;

    await user.save();

    return res.json({ message: "User promoted to uploader", user });
  } catch (err) {
    console.error("approveUploader:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * GET /api/admin/videos/pending
 * Admin-only: list all pending videos (for moderation)
 */
export const listPendingVideos = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin only" });
    }

    const pending = await Video.find({ status: "pending" }).populate(
      "uploaderId",
      "username email"
    );
    return res.json({ videos: pending });
  } catch (err) {
    console.error("listPendingVideos:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * PUT /api/admin/videos/:id/status
 * Admin-only: update a video's status (published/rejected/etc)
 * Body: { status: "published" }
 */
export const updateVideoStatus = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin only" });
    }

    const { id } = req.params;
    const { status } = req.body;
    if (!["published", "rejected", "pending"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const video = await Video.findById(id);
    if (!video) return res.status(404).json({ message: "Video not found" });

    video.status = status;
    await video.save();

    return res.json({ message: "Video status updated", video });
  } catch (err) {
    console.error("updateVideoStatus:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
