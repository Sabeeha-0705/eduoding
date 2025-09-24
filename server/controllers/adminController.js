// server/controllers/adminController.js
import mongoose from "mongoose";
import User from "../models/authModel.js";

/**
 * GET /api/admin/uploader-requests
 * Returns users who requested uploader (regardless of current role).
 * Use this if you want admin to see all requests even if role was changed.
 */
export const getUploaderRequests = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin only" });
    }

    // NOTE: changed to show all users who requested uploader, regardless of role.
    const requests = await User.find({ requestedUploader: true })
      .select("username email role requestedUploader createdAt");

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
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // if already uploader, just clear requestedUploader and return
    if (user.role === "uploader") {
      if (user.requestedUploader) {
        user.requestedUploader = false;
        await user.save();
      }
      return res.json({ message: "User already uploader", user });
    }

    user.role = "uploader";
    user.requestedUploader = false;
    await user.save();

    return res.json({ message: "User promoted to uploader", user });
  } catch (err) {
    console.error("approveUploader:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
