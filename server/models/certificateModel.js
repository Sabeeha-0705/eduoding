import mongoose from "mongoose";

const certificateSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // store as string always (ObjectId → string)
    courseId: {
      type: String,
      required: true,
    },

    quizId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Quiz",
      default: null,
    },

    score: {
      type: Number,
      required: true,
    },

    passed: {
      type: Boolean,
      required: true,
    },

    pdfUrl: {
      type: String,
      default: null,
    },

    // ⭐ NEW: store certificate unique ID printed on PDF
    certificateId: {
      type: String,
      unique: true,
      required: true,
    },
  },
  { timestamps: true }
);

// Recommended index for verification lookup
certificateSchema.index({ certificateId: 1 });

const Certificate = mongoose.model("Certificate", certificateSchema);
export default Certificate;
