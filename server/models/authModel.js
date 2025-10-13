// server/models/authModel.js
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    // Basic identity
    username: {
      type: String,
      required: [true, "Username is required"],
      trim: true,
    },

    name: {
      type: String,
      trim: true,
      default: "",
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email"],
    },

    password: {
      type: String,
      minlength: [8, "Password must be at least 8 characters long"],
    },

    // Google / OAuth login
    googleId: { type: String, default: null },
    provider: { type: String, enum: ["local", "google"], default: "local" },

    // OTP verification
    isVerified: { type: Boolean, default: false },
    otp: { type: String, default: null },
    otpExpires: { type: Date, default: null },

    // Role & permissions
    role: {
      type: String,
      enum: ["user", "uploader", "admin"],
      default: "user",
    },
    requestedUploader: { type: Boolean, default: false },

    // Avatar (Cloudinary / local)
    avatarUrl: {
      type: String,
      default: "",
    },

    // Theme settings (for profile color / dark-light)
    theme: {
      type: String,
      enum: ["light", "dark", "system"],
      default: "system",
    },

    // --------- Gamification fields ----------
    points: { type: Number, default: 0 },
    badges: { type: [String], default: [] },

    // Quiz performance history
    quizHistory: [
      {
        courseId: { type: String },
        score: { type: Number },
        date: { type: Date, default: Date.now },
      },
    ],

    // Certificates (optional)
    certificates: [
      {
        courseId: String,
        pdfUrl: String,
        score: Number,
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

// Safe public payload method (used in frontend)
userSchema.methods.publicProfile = function () {
  return {
    id: this._id,
    username: this.username,
    name: this.name || "",
    email: this.email,
    role: this.role,
    avatarUrl: this.avatarUrl || "",
    points: this.points || 0,
    badges: this.badges || [],
    theme: this.theme || "system",
  };
};

const User = mongoose.model("User", userSchema);
export default User;
