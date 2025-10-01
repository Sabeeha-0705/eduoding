// server/scripts/seedVideos.js
import mongoose from "mongoose";
import dotenv from "dotenv";
import Video from "../models/videoModel.js";
import fs from "fs";
import path from "path";

dotenv.config();

const MONGO = process.env.MONGO_URI || process.env.MONGO_URI_LOCAL || "mongodb://localhost:27017/mydatabase";

const run = async () => {
  try {
    await mongoose.connect(MONGO, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log("✅ DB Connected");

    // read JSON file
    const raw = fs.readFileSync(path.resolve("./server/seed/sampleVideos.json"), "utf-8");
    const videos = JSON.parse(raw);

    // optional: clear old docs (BE CAREFUL in production)
    await Video.deleteMany({});
    console.log("🗑  Old videos cleared");

    // Ensure all inserted docs have required fields; fill defaults
    const prepared = videos.map((v) => ({
      title: v.title || "Sample video",
      description: v.description || "",
      uploaderId: v.uploaderId || undefined, // optional
      sourceType: v.sourceType || (v.youtubeUrl ? "youtube" : "upload"),
      youtubeUrl: v.youtubeUrl || v.fileUrl || undefined,
      fileUrl: v.fileUrl || undefined,
      thumbnailUrl: v.thumbnailUrl || undefined,
      duration: v.duration || undefined,
      courseId: v.courseId ? String(v.courseId) : undefined,
      status: v.status || "approved", // default to approved for testing
      createdAt: v.createdAt ? new Date(v.createdAt) : undefined,
      updatedAt: v.updatedAt ? new Date(v.updatedAt) : undefined,
    }));

    await Video.insertMany(prepared);
    console.log("🎉 Sample videos inserted");

    process.exit(0);
  } catch (err) {
    console.error("❌ Seeder error:", err);
    process.exit(1);
  }
};

run();
