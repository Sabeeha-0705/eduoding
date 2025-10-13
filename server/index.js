// server/index.js
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
import judge0Routes from "./routes/judge0Routes.js";
import quizRoutes from "./routes/quizRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import codeRoutes from "./routes/codeRoutes.js";
import codeTestRoutes from "./routes/codeTestRoutes.js";
import sendEmail, { verifyTransporter } from "./utils/sendEmail.js";

dotenv.config();
connectDB();

const app = express();

// 🛡 Trust proxy for rate limiter + Render support
app.set("trust proxy", true);

// Parse JSON requests safely
app.use(express.json({ limit: "10mb" }));

// ==================== RATE LIMITER ====================
const globalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 200, // 200 requests/min per IP
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const xf = req.headers["x-forwarded-for"];
    if (xf && typeof xf === "string") {
      return xf.split(",")[0].trim();
    }
    return (
      req.ip ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      req.hostname ||
      "unknown"
    );
  },
});
app.use(globalLimiter);

// ==================== CORS ====================
const allowedOrigins = new Set([
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://eduoding-frontend.onrender.com",
]);

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (!origin) {
    res.setHeader("Access-Control-Allow-Origin", "*");
  } else if (allowedOrigins.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  } else {
    console.warn(`🚫 CORS Blocked: ${origin}`);
    res.setHeader("Access-Control-Allow-Origin", "null");
  }

  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Authorization, X-Requested-With, Content-Type, Accept"
  );
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,POST,PUT,PATCH,DELETE,OPTIONS"
  );
  next();
});
app.options("*", (req, res) => res.sendStatus(200));

// ==================== STATIC & CORE ====================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.get("/", (_, res) => res.send("🚀 Eduoding API is running..."));
app.get("/healthz", (_, res) => res.status(200).json({ ok: true }));

// Log email environment sanity
console.log("✅ SENDGRID_API_KEY loaded:", !!process.env.SENDGRID_API_KEY);
console.log("📧 EMAIL_FROM:", process.env.EMAIL_FROM);

// ==================== ROUTES ====================
app.use("/api/auth", authRoutes);
app.use("/api/lessons", lessonRoutes);
app.use("/api/notes", noteRoutes);
app.use("/api/progress", progressRoutes);
app.use("/api/videos", videoRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/quiz", quizRoutes);
app.use("/api/leaderboard", leaderboardRoutes);
app.use("/api/judge0", judge0Routes);
app.use("/api/users", userRoutes);
app.use("/api/code", codeRoutes);
app.use("/api/code-test", codeTestRoutes);

// ==================== UPLOADS (Local Fallback) ====================
// Serve uploaded files locally only (when Cloudinary is off)
const uploadsPath = path.join(__dirname, "uploads");
app.use("/uploads", express.static(uploadsPath));

// ==================== DEBUG ROUTES ====================

// 🧩 List all API routes
app.get("/api/debug/list-routes", (req, res) => {
  try {
    const routes = [];
    const extract = (stack, prefix = "") => {
      stack.forEach((layer) => {
        if (layer.route?.path) {
          const methods = Object.keys(layer.route.methods)
            .map((m) => m.toUpperCase())
            .join(",");
          routes.push(`${methods} ${prefix}${layer.route.path}`);
        } else if (layer.name === "router" && layer.handle?.stack) {
          extract(layer.handle.stack, prefix);
        }
      });
    };
    if (app._router?.stack) extract(app._router.stack, "");
    res.json({ total: routes.length, routes });
  } catch (err) {
    console.error("list-routes error:", err);
    res.status(500).json({ message: "Error listing routes" });
  }
});

// ✉️ Test email delivery
app.get("/api/debug/test-email", async (req, res) => {
  try {
    const result = await sendEmail({
      to: process.env.ADMIN_EMAILS || "your-admin@example.com",
      subject: "Eduoding Test Email",
      text: "✅ This is a test email from Eduoding backend.",
    });
    res.json({ message: "Email sent successfully!", result });
  } catch (err) {
    console.error("Test email error:", err);
    res.status(500).json({ message: err?.message || "Email failed" });
  }
});

// ==================== STARTUP VERIFY ====================
verifyTransporter().catch((err) =>
  console.error("verifyTransporter error:", err?.message || err)
);

// ==================== ERROR HANDLER ====================
app.use((err, req, res, next) => {
  console.error("💥 Unhandled error:", err?.stack || err);
  res
    .status(err?.status || 500)
    .json({ message: err?.message || "Internal Server Error" });
});

// ==================== START SERVER ====================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`🔥 Eduoding backend running at: http://localhost:${PORT}`)
);
