// server/uploads/multerConfig.js
import multer from "multer";
import path from "path";
import fs from "fs";

// ===== VIDEO UPLOAD (recommended: disk storage to avoid large memory usage) =====
const videoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), "uploads", "videos");
    // ensure dir exists
    fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const name = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, name);
  },
});

export const videoUpload = multer({
  storage: videoStorage,
  limits: {
    // allow up to 1GB video (adjust if you want smaller)
    fileSize: 1024 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const allowedExt = [".mp4", ".mov", ".mkv", ".webm", ".avi"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExt.includes(ext)) return cb(null, true);
    cb(new Error("Only video files allowed (mp4, mov, mkv, webm, avi)"));
  },
});

// ===== IMAGE / AVATAR UPLOAD (memoryStorage => easy to stream to Cloudinary) =====
const imageStorage = multer.memoryStorage();

export const imageUpload = multer({
  storage: imageStorage,
  limits: {
    // avatars should be small — 5MB max
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    // Accept common image mimetypes
    const allowedMime = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (allowedMime.includes(file.mimetype)) return cb(null, true);
    cb(new Error("Only image files allowed (jpeg, png, webp, gif)"));
  },
});

// default export (optional) — but prefer named imports in routes
export default {
  videoUpload,
  imageUpload,
};
