// server/controllers/adminController.js
import User from "../models/authModel.js";
import Video from "../models/videoModel.js";
import Lesson from "../models/lessonModel.js";
import sendEmail from "../utils/sendEmail.js";

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

    // try notify user
    try {
      if (user.email) {
        await sendEmail({
          to: user.email,
          subject: "You are approved as Uploader ✅",
          html: `<p>Hi ${user.username || ""},</p><p>Your uploader request has been <strong>approved</strong>. You can now upload videos.</p>`,
        });
      }
    } catch (e) {
      console.warn("approveUploader: failed to send email:", e && e.message ? e.message : e);
    }

    return res.json({ message: "User promoted to uploader", user });
  } catch (err) {
    console.error("approveUploader:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * GET /api/admin/videos/pending
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
 * Accepts "approved"|"published"|"rejected"|"pending" from frontend.
 * Normalizes "published" -> "approved" in DB so other code stays consistent.
 * When transitioning to approved, auto-create a Lesson (if courseId present) and notify uploader.
 */
export const updateVideoStatus = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin only" });
    }

    const { id } = req.params;
    let { status } = req.body;
    if (!status) return res.status(400).json({ message: "status required" });

    // normalize
    if (status === "published") status = "approved";

    if (!["approved", "rejected", "pending"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const video = await Video.findById(id);
    if (!video) return res.status(404).json({ message: "Video not found" });

    const prevStatus = video.status;
    video.status = status;
    await video.save();

    // If we moved to approved, create Lesson if courseId exists
    if (prevStatus !== "approved" && status === "approved") {
      try {
        const courseId = video.courseId;
        if (courseId) {
          const videoUrl = video.sourceType === "youtube" ? video.youtubeUrl : (video.fileUrl || "");
          // avoid duplicate lessons for same videoUrl+courseId
          const existing = await Lesson.findOne({ courseId: String(courseId), videoUrl });
          if (!existing) {
            await Lesson.create({
              title: video.title || "Untitled Lesson",
              type: video.sourceType === "youtube" ? "youtube" : "upload",
              videoUrl,
              courseId: String(courseId),
              uploadedBy: video.uploaderId,
            });
            console.log("Lesson created from approved video:", video._id);
          } else {
            console.log("Lesson already exists for this video/course:", video._id);
          }
        } else {
          console.warn("Video approved but has no courseId — admin should set courseId first to auto-create lesson.");
        }
      } catch (e) {
        console.error("Creating lesson from approved video failed:", e && e.message ? e.message : e);
      }

      // Notify uploader
      try {
        const uploader = await User.findById(video.uploaderId).select("email username");
        if (uploader && uploader.email) {
          const frontendUrl = process.env.FRONTEND_URL || "";
          await sendEmail({
            to: uploader.email,
            subject: `Your video "${video.title}" was approved ✅`,
            html: `<p>Hi ${uploader.username || ""},</p>
                   <p>Your video "<strong>${video.title}</strong>" has been <strong>approved</strong> by admin.</p>
                   ${frontendUrl ? `<p><a href="${frontendUrl}/uploader/dashboard">Open uploader dashboard</a></p>` : ""}`
          });
          console.log("Notified uploader about approval:", uploader.email);
        }
      } catch (notifyErr) {
        console.warn("Failed to send uploader approval email:", notifyErr && notifyErr.message ? notifyErr.message : notifyErr);
      }
    }

    if (status === "rejected") {
      try {
        const uploader = await User.findById(video.uploaderId).select("email username");
        if (uploader && uploader.email) {
          await sendEmail({
            to: uploader.email,
            subject: `Your video "${video.title}" was rejected`,
            html: `<p>Hi ${uploader.username || ""},</p><p>Your video "<strong>${video.title}</strong>" was <strong>rejected</strong> by admin.</p>`
          });
        }
      } catch (e) {
        console.warn("Failed to notify uploader about rejection:", e && e.message ? e.message : e);
      }
    }

    return res.json({ message: "Video status updated", video });
  } catch (err) {
    console.error("updateVideoStatus:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

export default {
  getUploaderRequests,
  approveUploader,
  listPendingVideos,
  updateVideoStatus,
};
