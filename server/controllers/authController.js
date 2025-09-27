// server/controllers/authController.js
import { OAuth2Client } from "google-auth-library";
import User from "../models/authModel.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { notifyAdminsAboutUploaderRequest } from "../utils/notify.js";
import { sendOTP } from "../utils/sendEmail.js"; // safe sendOTP

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );
};

// -------------------------------
// Signup with OTP + uploader request
export const registerUser = async (req, res) => {
  try {
    const { username, email, password, requestedUploader } = req.body;

    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: "User already exists" });

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = Date.now() + 5 * 60 * 1000;

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    user = new User({
      username,
      email,
      password: hashedPassword,
      otp,
      otpExpires,
      isVerified: false,
      provider: "local",
      role: "user",
      requestedUploader:
        requestedUploader === true || requestedUploader === "true",
    });

    await user.save();

    // Send OTP to user — catch errors so signup still succeeds even if mail fails
    try {
      await sendOTP(email, otp);
    } catch (mailErr) {
      console.error("Warning: OTP email failed to send:", mailErr && mailErr.message ? mailErr.message : mailErr);
      // optionally: inform frontend that OTP not sent by adding flag in response
      // return res.status(500).json({ message: "User created but failed to send OTP email" });
    }

    // Notify admin if requested uploader — notify.js itself is safe (try/catch inside)
    if (user.requestedUploader) {
      console.log(`📩 ${email} requested uploader access`);
      notifyAdminsAboutUploaderRequest(user).catch((e) => console.error(e));
    }

    res.json({ message: "OTP sent to email (if configured). Please verify." });
  } catch (err) {
    console.error("registerUser error:", err && err.message ? err.message : err);
    res.status(500).json({ message: err.message || "Server error" });
  }
};

// rest of controller functions (verifyOTP, loginUser, forgotPassword, resetPassword, googleLogin)
// keep as-is (no change needed)...
