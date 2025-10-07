// server/index.js (updated)
// This is your main server entry with trust-proxy and safer rate-limit key generation.

import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import rateLimit from "express-rate-limit";

import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import lessonRoutes from "./routes/lessonRoutes.js";
import noteRoutes from "./routes/noteRoutes.js";
import progressRoutes from "./routes/progressRoutes.js";
import videoRoutes from "./routes/videoRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import courseRoutes from "./routes/courseRoutes.js";
import leaderboardRoutes from "./routes/leaderboardRoutes.js";
import judge0Routes from "./routes/judge0Routes.js"; // optional if created
import quizRoutes from "./routes/quizRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import codeRoutes from "./routes/codeRoutes.js";
import codeTestRoutes from "./routes/codeTestRoutes.js";
import sendEmail, { verifyTransporter } from "./utils/sendEmail.js";

dotenv.config();
connectDB();

const app = express();

// IMPORTANT: trust proxy so req.ip and X-Forwarded-For behave correctly behind Render / proxies
// This avoids express-rate-limit errors related to IP/key generation.
app.set("trust proxy", true);

// Body parsing
app.use(express.json({ limit: "10mb" }));

/**
 * Global rate limiter (mild). Use a robust keyGenerator that prefers X-Forwarded-For
 * (helps when behind proxies). This avoids express-rate-limit IPv6/key-generator warnings.
 */
const globalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 200, // general requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const xf = req.headers["x-forwarded-for"];
    if (xf && typeof xf === "string") {
      // x-forwarded-for can be comma-separated list; use first value
      return xf.split(",")[0].trim();
    }
    // fallback to express-derived ip
    return req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || req.hostname || "unknown";
  },
});

app.use(globalLimiter);

// Allowed frontends (dev + prod)
const allowedOrigins = new Set([
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://eduoding-frontend.onrender.com",
]);

// CORS middleware (explicit headers so preflight passes)
// Keeps your previous behavior but stable behind proxies
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (!origin) {
    res.setHeader("Access-Control-Allow-Origin", "*");
  } else if (allowedOrigins.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  } else {
    console.warn(`CORS: blocked origin -> ${origin}`);
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
app.use("/api/leaderboard", leaderboardRoutes);

// judge0 endpoints (practice/run). Make sure judge0Routes uses its own limiter too.
app.use("/api/judge0", judge0Routes);

app.use("/api/users", userRoutes);
app.use("/api/code", codeRoutes);

// NOTE: codeTestRoutes includes its own per-user limiter - keep that
app.use("/api/code-test", codeTestRoutes);

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
