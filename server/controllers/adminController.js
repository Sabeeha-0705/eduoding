// server/controllers/adminController.js
import User from "../models/authModel.js";

/**
 * GET /api/admin/uploader-requests
 * Return users who requested uploader access (requestedUploader === true)
 * Protected route (admin only) — ensure route uses protect middleware
 */
export const getUploaderRequests = async (req, res) => {
  try {
    // only admin can view
    if (req.user?.role !== "admin") return res.status(403).json({ message: "Admin only" });

    // find users who requested uploader and are still plain "user"
    const requests = await User.find({ requestedUploader: true, role: "user" }).select(
      "username email requestedUploader createdAt"
    );

    res.json(requests);
  } catch (err) {
    console.error("getUploaderRequests error:", err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * PUT /api/admin/approve-uploader/:id
 * Promote a user to uploader and clear requestedUploader flag
 */
export const approveUploader = async (req, res) => {
  try {
    if (req.user?.role !== "admin") return res.status(403).json({ message: "Admin only" });

    const userId = req.params.id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.role = "uploader";
    user.requestedUploader = false;
    await user.save();

    res.json({ message: "User promoted to uploader", user });
  } catch (err) {
    console.error("approveUploader error:", err);
    res.status(500).json({ message: err.message });
  }
};
