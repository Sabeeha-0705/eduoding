import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    username: { 
      type: String, 
      required: [true, "Username is required"], 
      trim: true,
      minlength: [3, "Username must be at least 3 characters long"],
      maxlength: [10, "Username must be less than 10 characters"]
    },

    email: { 
      type: String, 
      required: [true, "Email is required"], 
      unique: true, 
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email"] // general email check
    },

    password: { 
      type: String,
      minlength: [8, "Password must be at least 8 characters long"],
      validate: {
        validator: function(v) {
          return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(v);
        },
        message: props => `Password must include 1 uppercase, 1 lowercase, 1 number, and 1 special character`
      }
    },

    // Google Auth
    googleId: { type: String },
    provider: { type: String, default: "local" }, // local / google

    // OTP verification
    isVerified: { type: Boolean, default: false },
    otp: { type: String },
    otpExpires: { type: Date }
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);
export default User;
