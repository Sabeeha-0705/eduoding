import { OAuth2Client } from "google-auth-library";
import User from "../models/authModel.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { notifyAdminsAboutUploaderRequest } from "../utils/notify.js";
import { sendOTP } from "../utils/sendEmail.js";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const generateToken = (user) => {
  return jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });
};
// password strength regex (frontend should use same)
const PW_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;
// -------------------------------
// Signup with OTP + uploader request
export const registerUser = async (req, res) => {
  try {
    const { username, email, password, requestedUploader } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: "username, email and password required" });
    }

    // validate password BEFORE hashing (so we check user input, not hashed string)
    if (!PW_REGEX.test(password)) {
      return res.status(400).json({
        message:
          "Password must include 1 uppercase, 1 lowercase, 1 number, and 1 special character",
      });
    }

    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: "User already exists" });

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = Date.now() + 5 * 60 * 1000; // 5 minutes

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
      console.error(
        "Warning: OTP email failed to send:",
        mailErr && mailErr.message ? mailErr.message : mailErr
      );
      // still continue; frontend will show verify flow
    }

    // Notify admin if requested uploader
    if (user.requestedUploader) {
      console.log(`📩 ${email} requested uploader access`);
      notifyAdminsAboutUploaderRequest(user).catch((e) =>
        console.error("notifyAdmins error:", e && e.message ? e.message : e)
      );
    }

    res.json({ message: "OTP sent to email (if configured). Please verify." });
  } catch (err) {
    console.error("registerUser error:", err && err.message ? err.message : err);
    res.status(500).json({ message: err.message || "Server error" });
  }
};


// -------------------------------
// OTP Verification
export const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });

    if (!user.otp || user.otp.toString() !== otp.toString() || user.otpExpires < Date.now()) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    user.isVerified = true;
    user.otp = null;
    user.otpExpires = null;
    await user.save();

    const token = generateToken(user);
    res.json({ message: "Email verified successfully!", token, user });
  } catch (err) {
    console.error("verifyOTP error:", err.message || err);
    res.status(500).json({ message: err.message || "Server error" });
  }
};

// -------------------------------
// Login
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });
    if (!user.isVerified) {
      return res.status(400).json({ message: "Please verify your email first" });
    }
    const isMatch = await bcrypt.compare(password, user.password || "");
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    const token = generateToken(user);
    res.json({ message: "Login successful", token, user });
  } catch (err) {
    console.error("loginUser error:", err.message || err);
    res.status(500).json({ message: err.message || "Server error" });
  }
};

// -------------------------------
// Forgot Password
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });

    const resetOtp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = resetOtp;
    user.otpExpires = Date.now() + 5 * 60 * 1000;
    await user.save();

    try {
      await sendOTP(email, resetOtp, "Password Reset OTP");
    } catch (mailErr) {
      console.error("forgotPassword mail error:", mailErr.message || mailErr);
      return res.status(500).json({ message: "Failed to send reset OTP" });
    }

    res.json({ message: "Reset OTP sent to your email" });
  } catch (err) {
    console.error("forgotPassword error:", err.message || err);
    res.status(500).json({ message: err.message || "Server error" });
  }
};

// -------------------------------
// Reset Password
export const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });
    if (!user.otp || user.otp !== otp || user.otpExpires < Date.now()) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.otp = null;
    user.otpExpires = null;
    await user.save();

    res.json({ message: "✅ Password reset successful!" });
  } catch (err) {
    console.error("resetPassword error:", err.message || err);
    res.status(500).json({ message: err.message || "Server error" });
  }
};

// -------------------------------
// Google Login
export const googleLogin = async (req, res) => {
  try {
    const { token } = req.body;
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, name } = payload;

    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        username: name,
        email,
        password: null,
        provider: "google",
        isVerified: true,
      });
    }

    const appToken = generateToken(user);
    res.json({ token: appToken, user });
  } catch (error) {
    console.error("googleLogin error:", error.message || error);
    res.status(500).json({ message: "Google login failed" });
  }
};
