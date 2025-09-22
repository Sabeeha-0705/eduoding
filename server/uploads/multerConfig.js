// server/uploads/multerConfig.js
import multer from "multer";

const storage = multer.memoryStorage(); // store file in memory (buffer)
export const upload = multer({
  storage,
  limits: { fileSize: 1024 * 1024 * 1024 }, // 1GB
  fileFilter(req, file, cb) {
    const allowed = [".mp4", ".mov", ".mkv", ".webm"];
    const ext = (file.originalname.match(/\.[^.]+$/) || [""])[0].toLowerCase();
    if (allowed.includes(ext)) return cb(null, true);
    cb(new Error("Only video files allowed (mp4, mov, mkv, webm)"));
  },
});
