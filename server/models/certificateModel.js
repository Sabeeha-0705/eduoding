import mongoose from "mongoose";

const certificateSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  courseId: { type: String, required: true },
  quizId: { type: mongoose.Schema.Types.ObjectId, ref: "Quiz" },
  score: { type: Number, required: true },
  passed: { type: Boolean, required: true },
  pdfUrl: { type: String }, // optional cloudinary or storage link
}, { timestamps: true });

const Certificate = mongoose.model("Certificate", certificateSchema);
export default Certificate;
