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
// inside authController.js - replace registerUser implementation with this
export const registerUser = async (req, res) => {
  try {
    const { username, email: rawEmail, password, requestedUploader } = req.body;
    const email = (rawEmail || "").toLowerCase().trim();

    if (!username || !email || !password) {
      return res.status(400).json({ message: "username, email and password required" });
    }

    if (!PW_REGEX.test(password)) {
      return res.status(400).json({
        message:
          "Password must include 1 uppercase, 1 lowercase, 1 number, and 1 special character",
      });
    }

    // check existing
    let existing = await User.findOne({ email });
    if (existing) {
      // if existing but not verified - allow resend OTP instead of blocking
      if (!existing.isVerified) {
        // generate new otp & update
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpires = Date.now() + 5 * 60 * 1000;
        existing.otp = otp;
        existing.otpExpires = otpExpires;
        await existing.save();

        // try send OTP
        const sendResult = await sendOTP(email, otp);
        // respond telling frontend OTP resent; include OTP in response only if email send failed (dev)
        if (!sendResult.success) {
          return res.json({
            message: "OTP resend (email failed). Use this OTP for verification (dev).",
            otp,
          });
        } else {
          return res.json({ message: "OTP resent to email. Please verify." });
        }
      }

      // if already verified, reject signup as duplicate
      return res.status(409).json({ message: "User already exists" });
    }

    // create new user
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = Date.now() + 5 * 60 * 1000;

    const user = new User({
      username,
      email,
      password: hashedPassword,
      otp,
      otpExpires,
      isVerified: false,
      provider: "local",
      role: "user",
      requestedUploader: requestedUploader === true || requestedUploader === "true",
    });

    await user.save();

    // send OTP and check result
    const sendResult = await sendOTP(email, otp);
    if (!sendResult.success) {
      console.warn("Warning: OTP email failed to send:", sendResult.error && sendResult.error.message ? sendResult.error.message : sendResult.error);
      // for development, return OTP in response so frontend can show it (ONLY when email disabled)
      return res.json({ message: "OTP send failed (email). Use the OTP from response (dev).", otp });
    }

    // optionally notify admins
    if (user.requestedUploader) {
      notifyAdminsAboutUploaderRequest(user).catch((e) => console.error("notifyAdmins error:", e && e.message ? e.message : e));
    }

    res.json({ message: "OTP sent to email. Please verify." });
  } catch (err) {
    console.error("registerUser error:", err && err.message ? err.message : err);
    res.status(500).json({ message: err.message || "Server error" });
  }
};



// -------------------------------
// OTP Verification
export const verifyOTP = async (req, res) => {
  try {
    // when reading email from request
const email = (req.body.email || "").toLowerCase().trim();
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
