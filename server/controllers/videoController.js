// server/controllers/videoController.js
import Video from "../models/Video.js";
import { extractMetadataAndThumbnail } from "../utils/videoProcessing.js";
import path from "path";
import fetch from "node-fetch"; // Node 18+ has global fetch; if older node use node-fetch
import fs from "fs";

export const uploadVideoFile = async (req, res) => {
  try {
    // req.file from multer
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const fileUrl = `/uploads/${req.file.filename}`;

    // try extracting metadata and thumbnail (guarded)
    const fullPath = path.join(process.cwd(), "server", "uploads", req.file.filename);
    const { duration, thumbnail } = (await extractMetadataAndThumbnail(fullPath)) || {};

    // move thumbnail path to file system + set thumbnailUrl
    let thumbnailUrl = thumbnail || null;

    const video = await Video.create({
      title: req.body.title || req.file.originalname,
      description: req.body.description || "",
      uploaderId: req.user._id,
      sourceType: "upload",
      fileUrl,
      thumbnailUrl,
      duration,
      status: "pending",
    });

    res.json({ message: "Upload successful", video });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

export const addYoutubeVideo = async (req, res) => {
  try {
    const { youtubeUrl, title, description } = req.body;
    if (!youtubeUrl) return res.status(400).json({ message: "YouTube URL required" });

    // Use YouTube oEmbed to fetch title/thumbnail (no API key required)
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(
      youtubeUrl
    )}&format=json`;

    let meta = {};
    try {
      const r = await fetch(oembedUrl);
      if (r.ok) meta = await r.json();
    } catch (e) {
      // ignore — fallback to provided title
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

    res.json({ message: "YouTube video saved", video });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

// list uploader's videos
export const getMyVideos = async (req, res) => {
  try {
    const videos = await Video.find({ uploaderId: req.user._id }).sort({ createdAt: -1 });
    res.json(videos);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// public get (published only)
export const getVideoById = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ message: "Video not found" });
    res.json(video);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// edit metadata (uploader or admin)
export const updateVideo = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ message: "Video not found" });

    // only uploader or admin can edit
    if (video.uploaderId.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden" });
    }

    const allowed = ["title", "description", "status"];
    allowed.forEach((k) => {
      if (req.body[k] !== undefined) video[k] = req.body[k];
    });

    await video.save();
    res.json({ message: "Updated", video });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
