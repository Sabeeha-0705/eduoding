// server/index.js (or app.js) — full file
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
import courseRoutes from "./routes/courseRoutes.js";
import quizRoutes from "./routes/quizRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import sendEmail, { verifyTransporter } from "./utils/sendEmail.js";

dotenv.config();
connectDB();

const app = express();
app.use(express.json({ limit: "10mb" }));

// Allowed frontends (dev + prod)
const allowedOrigins = new Set([
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://eduoding-frontend.onrender.com",
]);

// CORS middleware (explicit headers so preflight passes)
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (!origin) {
    res.setHeader("Access-Control-Allow-Origin", "*");
  } else if (allowedOrigins.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  } else {
    console.warn(`CORS: blocked origin -> ${origin}`);
    // Deny by setting null OR you can choose to allow for debug
    res.setHeader("Access-Control-Allow-Origin", "null");
  }

  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Authorization, X-Requested-With, Content-Type, Accept"
  );
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  next();
});

// quick reply to preflight
app.options("*", (req, res) => res.sendStatus(200));

// static helpers
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.get("/", (_, res) => res.send("API is running"));
app.get("/healthz", (_, res) => res.status(200).json({ ok: true }));

console.log("SENDGRID_API_KEY present:", !!process.env.SENDGRID_API_KEY);
console.log("EMAIL_FROM:", process.env.EMAIL_FROM);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/lessons", lessonRoutes);
app.use("/api/notes", noteRoutes);
app.use("/api/progress", progressRoutes);
app.use("/api/videos", videoRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/quiz", quizRoutes);
app.use("/api/users", userRoutes);
// Verify transporter at startup
verifyTransporter().catch((err) => {
  console.error("verifyTransporter error (startup):", err?.message || err);
});

// Serve uploads
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Debug: list routes
app.get("/api/debug/list-routes", (req, res) => {
  try {
    const routes = [];
    function extract(stack, prefix = "") {
      stack.forEach((layer) => {
        if (layer.route && layer.route.path) {
          const methods = Object.keys(layer.route.methods || {})
            .map((m) => m.toUpperCase())
            .join(",");
          routes.push(`${methods} ${prefix}${layer.route.path}`);
        } else if (layer.name === "router" && layer.handle?.stack) {
          extract(layer.handle.stack, prefix);
        }
      });
    }
    if (app._router?.stack) extract(app._router.stack, "");
    res.json({ routes });
  } catch (err) {
    console.error("list-routes error:", err);
    res.status(500).json({ message: "Server error listing routes" });
  }
});

// Test email route
app.get("/api/debug/test-email", async (req, res) => {
  try {
    const result = await sendEmail({
      to: process.env.ADMIN_EMAILS || "your-admin@example.com",
      subject: "Eduoding test email",
      text: "✅ This is a test email from Eduoding backend",
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err?.message || "Test email failed" });
  }
});

// Generic error handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err?.stack || err);
  res.status(err?.status || 500).json({ message: err?.message || "Server error" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
