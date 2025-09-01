import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db.js";   // 👈 DB connection file
import authRoutes from "./routes/authRoutes.js";
import lessonRoutes from "./routes/lessonRoutes.js";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

// Connect DB
connectDB();

const app = express();
app.use(express.json());

// ✅ Allow both local + deployed frontend
app.use(cors({
  origin: [
    "http://localhost:5173", 
    "https://eduoding-frontend.onrender.com"
  ],
  credentials: true
}));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test route
app.get("/", (req, res) => res.send("API is running"));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/lessons", lessonRoutes);

// Serve uploads folder
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
