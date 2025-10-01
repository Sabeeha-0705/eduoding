import mongoose from "mongoose";

const questionSchema = new mongoose.Schema({
  question: { type: String, required: true },
  options: [{ type: String, required: true }], // array of strings
  correctIndex: { type: Number, required: true } // index of correct option
});

const quizSchema = new mongoose.Schema({
  courseId: { type: String, required: true }, // match your course id type
  title: { type: String, default: "Course Quiz" },
  passPercent: { type: Number, default: 70 },
  questions: [questionSchema]
}, { timestamps: true });

const Quiz = mongoose.model("Quiz", quizSchema);
export default Quiz;
