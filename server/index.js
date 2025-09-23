// server/index.js
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import lessonRoutes from "./routes/lessonRoutes.js";
import noteRoutes from "./routes/noteRoutes.js";
import progressRoutes from "./routes/progressRoutes.js";
import videoRoutes from "./routes/videoRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";

dotenv.config();
connectDB();

const app = express();
app.use(express.json({ limit: "10mb" })); // safe default

// ✅ Allow dev + prod frontends
const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://eduoding-frontend.onrender.com",
];

app.use(
  cors({
    origin(origin, cb) {
      // allow server-to-server (no origin) and tooling
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  })
);

// Preflight
app.options("*", cors());

// Paths for static files (uploads)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Health + base
app.get("/", (_, res) => res.send("API is running"));
app.get("/healthz", (_, res) => res.status(200).json({ ok: true }));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/lessons", lessonRoutes);
app.use("/api/notes", noteRoutes);
app.use("/api/progress", progressRoutes);
app.use("/api/videos", videoRoutes);
app.use("/api/admin", adminRoutes);

// Static uploads (Render's disk is ephemeral; consider S3/Cloudinary for production)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Simple logging to help debugging deploys
console.log("Mounts registered: /api/auth, /api/lessons, /api/notes, /api/progress, /api/videos, /api/admin");

// Generic error handler (so errors show clearly in Render logs)
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err && err.stack ? err.stack : err);
  const status = err?.status || 500;
  res.status(status).json({ message: err?.message || "Server error" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
