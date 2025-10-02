// server/models/authModel.js
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, "Username is required"],
      trim: true,
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email"],
    },

    // Keep minlength so DB enforces some length.
    // We removed the complex regex validator because we hash passwords
    // before saving (hashed string won't match the regex). Instead,
    // validate password strength in controller before hashing.
    password: {
      type: String,
      minlength: [8, "Password must be at least 8 characters long"],
    },

    // Google / OAuth
    googleId: { type: String, default: null },
    provider: { type: String, enum: ["local", "google"], default: "local" },

    // OTP verification
    isVerified: { type: Boolean, default: false },
    otp: { type: String, default: null },
    otpExpires: { type: Date, default: null },

    // role for permissions
    role: { type: String, enum: ["user", "uploader", "admin"], default: "user" },

    // did user request uploader?
    requestedUploader: { type: Boolean, default: false },
      avatarUrl: { type: String }, 
  },
  
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);
export default User;
