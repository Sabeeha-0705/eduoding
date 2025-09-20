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

    password: {
      type: String,
      minlength: [8, "Password must be at least 8 characters long"],
      validate: {
        validator: function (v) {
          // at least 1 lowercase, 1 uppercase, 1 number, 1 special char
          return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(
            v
          );
        },
        message: () =>
          "Password must include 1 uppercase, 1 lowercase, 1 number, and 1 special character",
      },
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

    // any other fields (e.g. avatar, bio) can go here
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);
export default User;
