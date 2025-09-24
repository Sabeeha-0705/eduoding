// server/controllers/adminController.js
import User from "../models/authModel.js";

/**
 * GET /api/admin/uploader-requests
 * Returns users who requested uploader role and are still role === 'user'
 */
export const getUploaderRequests = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin only" });
    }

    // select only safe fields (no password)
    const requests = await User.find({ requestedUploader: true, role: "user" })
      .select("username email requestedUploader createdAt");

    return res.json(requests);
  } catch (err) {
    console.error("getUploaderRequests:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * PUT /api/admin/approve-uploader/:id
 * Promote a user to role 'uploader' and clear requestedUploader flag
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
    user.requestedUploader = false;
    await user.save();

    // return safe user (no password)
    const safeUser = {
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      requestedUploader: user.requestedUploader,
      updatedAt: user.updatedAt,
    };

    return res.json({ message: "User promoted to uploader", user: safeUser });
  } catch (err) {
    console.error("approveUploader:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
