// server/upload/multerConfig.js
import multer from "multer";
import path from "path";
import fs from "fs";

const uploadDir = path.join(process.cwd(), "server", "uploads"); // where mp4s will be stored
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, uploadDir);
  },
  filename(req, file, cb) {
    const safeName = `${Date.now()}-${file.originalname.replace(/\s+/g, "-")}`;
    cb(null, safeName);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: 1024 * 1024 * 1024 }, // 1GB limit (change if needed)
  fileFilter(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    if ([".mp4", ".mov", ".mkv", ".webm"].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Only video files allowed (mp4, mov, mkv, webm)"));
    }
  },
});
