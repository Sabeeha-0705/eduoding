// server/controllers/videoController.js
import Video from "../models/Video.js";
import { extractMetadataAndThumbnail } from "../utils/videoProcessing.js";
import path from "path";
import fs from "fs";
import mongoose from "mongoose";
import fetch from "node-fetch"; // if Node >= 18 you can remove this import
import { notifyAdminsAboutUpload } from "../utils/notify.js";


export const uploadVideoFile = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    // build public URL (adjust if you serve uploads from /uploads static)
    const fileUrl = `/uploads/${req.file.filename}`;

    // try extracting metadata and thumbnail (will return undefined on failure)
    const fullPath = path.join(process.cwd(), "server", "uploads", req.file.filename);
    let duration = null;
    let thumbnail = null;
    try {
      const meta = await extractMetadataAndThumbnail(fullPath);
      if (meta) {
        duration = meta.duration || null;
        thumbnail = meta.thumbnail || null;
      }
    } catch (metaErr) {
      console.warn("Video metadata extraction failed:", metaErr.message || metaErr);
      // continue without failing upload
    }

    const video = await Video.create({
      title: req.body.title || req.file.originalname,
      description: req.body.description || "",
      uploaderId: req.user._id,
      sourceType: "upload",
      fileUrl,
      thumbnailUrl: thumbnail,
      duration,
      status: "pending",
    });

    return res.json({ message: "Upload successful", video });
  } catch (err) {
    console.error("uploadVideoFile error:", err);
    // better client error message when possible
    const msg = err.message || "Upload failed";
    return res.status(500).json({ message: msg });
  }
};

export const addYoutubeVideo = async (req, res) => {
  try {
    const { youtubeUrl, title, description } = req.body;
    if (!youtubeUrl) return res.status(400).json({ message: "YouTube URL required" });

    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(youtubeUrl)}&format=json`;
    let meta = {};
    try {
      const r = await fetch(oembedUrl);
      if (r.ok) meta = await r.json();
    } catch (e) {
      // ignore and fallback
      console.warn("oEmbed failed:", e && e.message);
      meta = {};
    }

    const thumbnailUrl = meta.thumbnail_url || null;
    const video = await Video.create({
      title: title || meta.title || "YouTube Video",
      description: description || "",
      uploaderId: req.user._id,
      sourceType: "youtube",
      youtubeUrl,
      thumbnailUrl,
      status: "pending",
    });

    return res.json({ message: "YouTube video saved", video });
  } catch (err) {
    console.error("addYoutubeVideo error:", err);
    return res.status(500).json({ message: err.message || "Failed to save YouTube video" });
  }
};

export const getMyVideos = async (req, res) => {
  try {
    const videos = await Video.find({ uploaderId: req.user._id }).sort({ createdAt: -1 });
    return res.json(videos);
  } catch (err) {
    console.error("getMyVideos error:", err);
    return res.status(500).json({ message: err.message || "Failed to fetch uploads" });
  }
};

export const getVideoById = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId first to avoid CastError
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid video id" });
    }

    const video = await Video.findById(id);
    if (!video) return res.status(404).json({ message: "Video not found" });
    return res.json(video);
  } catch (err) {
    console.error("getVideoById error:", err);
    return res.status(500).json({ message: err.message || "Failed to fetch video" });
  }
};

export const updateVideo = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid video id" });
    }

    const video = await Video.findById(id);
    if (!video) return res.status(404).json({ message: "Video not found" });

    // only uploader or admin can edit
    if (String(video.uploaderId) !== String(req.user._id) && req.user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden" });
    }

    const allowed = ["title", "description", "status", "thumbnailUrl"];
    allowed.forEach((k) => {
      if (req.body[k] !== undefined) video[k] = req.body[k];
    });

    await video.save();
    return res.json({ message: "Updated", video });
  } catch (err) {
    console.error("updateVideo error:", err);
    return res.status(500).json({ message: err.message || "Update failed" });
  }
};
