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
import sendEmail, { verifyTransporter } from "./utils/sendEmail.js"; // ✅ keep

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
      if (!origin) return cb(null, true); // allow server-to-server (no origin)
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

// ✅ Debug email config at startup
console.log("SENDGRID_API_KEY present:", !!process.env.SENDGRID_API_KEY);
console.log("EMAIL_FROM:", process.env.EMAIL_FROM);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/lessons", lessonRoutes);
app.use("/api/notes", noteRoutes);
app.use("/api/progress", progressRoutes);
app.use("/api/videos", videoRoutes);
app.use("/api/admin", adminRoutes);

// ✅ Verify transporter at startup
verifyTransporter().catch((err) => {
  console.error("verifyTransporter error (startup):", err?.message || err);
});

// Static uploads
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Debug route to see all registered routes
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

// ✅ Quick test route to send test email
app.get("/api/debug/test-email", async (req, res) => {
  try {
    const result = await sendEmail({
      to: process.env.ADMIN_EMAILS || "sabeehafathimap@gmail.com",
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
