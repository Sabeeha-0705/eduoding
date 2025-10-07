// server/scripts/seedQuizzes.js
import dotenv from "dotenv";
import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import connectDB from "../config/db.js";
import Quiz from "../models/quizModel.js";

dotenv.config();
await connectDB();

const filePath = path.join(process.cwd(), "server", "data", "sampleQuizzes.json");

if (!fs.existsSync(filePath)) {
  console.error("❌ sampleQuizzes.json not found at", filePath);
  process.exit(1);
}

const raw = fs.readFileSync(filePath, "utf8");
const quizzes = JSON.parse(raw);

async function seed() {
  try {
    console.log(`🚀 Seeding quizzes... total: ${quizzes.length}`);
    for (const q of quizzes) {
      await Quiz.findOneAndUpdate({ courseId: q.courseId }, { $set: q }, { upsert: true });
      console.log(`✅ Seeded courseId: ${q.courseId} (${q.title})`);
    }
    console.log("🎉 Seeding finished successfully.");
    process.exit(0);
  } catch (err) {
    console.error("❌ Seed error:", err);
    process.exit(1);
  }
}

seed();
