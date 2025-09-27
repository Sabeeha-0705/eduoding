// server/models/authModel.js
import mongoose from "mongoose";

const passwordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

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

    // password is optional (for google accounts). Validate only when present.
    password: {
      type: String,
      // do not set required: true because google users have null password
      minlength: [
        8,
        "Password must be at least 8 characters long (when provided)",
      ],
      validate: {
        validator: function (v) {
          // if v is null/undefined/empty -> skip validation (allow)
          if (v === null || v === undefined || v === "") return true;
          // otherwise check regex
          return passwordRegex.test(v);
        },
        message:
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

    // did user request uploader?
    requestedUploader: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);
export default User;
