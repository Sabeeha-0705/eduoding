import mongoose from "mongoose";

const certificateSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },

  courseId: { 
    type: String, 
    required: true 
  },

  quizId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Quiz", 
    default: null 
  },

  score: { 
    type: Number, 
    required: true, 
    default: 0 
  },

  passed: { 
    type: Boolean, 
    required: true, 
    default: false 
  },

  pdfUrl: { 
    type: String, 
    default: null 
  },

  certificateId: { 
    type: String, 
    index: true 
  },

  // ⭐ IMPORTANT FOR QR FEATURE ⭐
  qrCodeUrl: { 
    type: String, 
    default: null 
  },

}, { timestamps: true });

const Certificate = mongoose.model("Certificate", certificateSchema);
export default Certificate;
