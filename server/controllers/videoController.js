// server/controllers/videoController.js
import Video from "../models/Video.js";
import User from "../models/authModel.js"; // added to fetch uploader email/username
import { notifyAdminsAboutUpload } from "../utils/notify.js";
import sendEmail from "../utils/sendEmail.js"; // new helper
import { v2 as cloudinary } from "cloudinary";
import streamifier from "streamifier";
//import mongoose from "mongoose";

// Cloudinary Config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// -------------------------------
// 🔹 Upload file (Cloudinary stream)
export const uploadVideoFile = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    // upload stream to Cloudinary
    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { resource_type: "video", folder: "eduoding" },
        (err, result) => (err ? reject(err) : resolve(result))
      );
      streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
    });

    const video = await Video.create({
      title: req.body.title || req.file.originalname,
      description: req.body.description || "",
      uploaderId: req.user._id,
      sourceType: "upload",
      fileUrl: result.secure_url,
      thumbnailUrl: result.thumbnail_url || null,
      duration: result.duration || null,
      status: "pending",
    });

    // 🔔 notify admins
    await notifyAdminsAboutUpload(video, req.user);

    return res.json({ message: "Upload successful", video });
  } catch (err) {
    console.error("uploadVideoFile error:", err);
    return res.status(500).json({ message: err.message || "Upload failed" });
  }
};

// -------------------------------
// 🔹 Add YouTube Video
export const addYoutubeVideo = async (req, res) => {
  try {
    const { youtubeUrl, title, description } = req.body;
    if (!youtubeUrl) return res.status(400).json({ message: "YouTube URL required" });

    const video = await Video.create({
      title: title || "YouTube Video",
      description: description || "",
      uploaderId: req.user._id,
      sourceType: "youtube",
      youtubeUrl,
      status: "pending",
    });

    // 🔔 notify admins
    await notifyAdminsAboutUpload(video, req.user);

    return res.json({ message: "YouTube video saved", video });
  } catch (err) {
    console.error("addYoutubeVideo error:", err);
    return res.status(500).json({ message: err.message || "Failed to save YouTube video" });
  }
};

// -------------------------------
// 🔹 Get My Videos
export const getMyVideos = async (req, res) => {
  try {
    const videos = await Video.find({ uploaderId: req.user._id }).sort({ createdAt: -1 });
    return res.json(videos);
  } catch (err) {
    console.error("getMyVideos error:", err);
    return res.status(500).json({ message: err.message || "Failed to fetch uploads" });
  }
};

// -------------------------------
// 🔹 Get Video by Id
export const getVideoById = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ message: "Video not found" });
    return res.json(video);
  } catch (err) {
    console.error("getVideoById error:", err);
    return res.status(500).json({ message: err.message || "Failed to fetch video" });
  }
};

// -------------------------------
// 🔹 Update Video
export const updateVideo = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ message: "Video not found" });

    if (String(video.uploaderId) !== String(req.user._id) && req.user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden" });
    }

    // save previous status to detect "published" transition
    const prevStatus = video.status;

    const allowed = ["title", "description", "status", "thumbnailUrl"];
    allowed.forEach((k) => {
      if (req.body[k] !== undefined) video[k] = req.body[k];
    });

    await video.save();

    // If admin changed status to published (and it wasn't published before) -> notify uploader
    try {
      if (prevStatus !== "published" && video.status === "published") {
        const uploader = await User.findById(video.uploaderId).select("email username");
        if (uploader && uploader.email) {
          const frontendUrl = process.env.FRONTEND_URL || "";
          const subject = `Your video "${video.title}" is published`;
          const text = `${uploader.username || "User"}, your video "${video.title}" has been published.`;
          const html = `
            <p>Hi ${uploader.username || ""},</p>
            <p>Your video "<strong>${video.title}</strong>" has been <strong>published</strong>.</p>
            <p>View it: <a href="${frontendUrl}/video/${video._id}">${frontendUrl ? "Open video" : "Visit dashboard"}</a></p>
            <p>— Eduoding team</p>
          `;
          await sendEmail({ to: uploader.email, subject, text, html });
          console.log("✅ Notified uploader about publish:", uploader.email);
        }
      }
    } catch (notifyErr) {
      console.warn("Failed to notify uploader:", notifyErr && notifyErr.message);
      // don't fail the main request if email fails
    }

    return res.json({ message: "Updated", video });
  } catch (err) {
    console.error("updateVideo error:", err);
    return res.status(500).json({ message: err.message || "Update failed" });
  }
};
