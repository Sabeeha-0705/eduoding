// server/scripts/seedQuizzes.js
import mongoose from "mongoose";
import dotenv from "dotenv";
import fs from "fs";
import Quiz from "../models/quizModel.js";

dotenv.config();

const run = async () => {
  try {
    if (!process.env.MONGO_URI) throw new Error("MONGO_URI missing in .env");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("DB connected");

    const raw = fs.readFileSync("./server/seed/sampleQuizzes.json", "utf-8");
    const quizzes = JSON.parse(raw);

    // Clear existing quiz data (optional)
    await Quiz.deleteMany({});
    console.log("Old quizzes removed");

    await Quiz.insertMany(quizzes);
    console.log("Sample quizzes inserted:", quizzes.length);

    process.exit(0);
  } catch (err) {
    console.error("Seeder error:", err);
    process.exit(1);
  }
};

run();
