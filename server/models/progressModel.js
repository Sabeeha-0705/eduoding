// server/models/progressModel.js
import mongoose from "mongoose";

const progressSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    // change courseId to String to accept "1" or real hex ids
    courseId: { type: String, required: true },
    completedLessonIds: { type: [String], default: [] }, // store lesson ids as strings
    completedPercent: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const Progress = mongoose.model("Progress", progressSchema);
export default Progress;
