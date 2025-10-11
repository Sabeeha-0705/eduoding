import { OAuth2Client } from "google-auth-library";
import User from "../models/authModel.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { notifyAdminsAboutUploaderRequest } from "../utils/notify.js";
import { sendOTP } from "../utils/sendEmail.js";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Helper: Generate JWT
const generateToken = (user) =>
  jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });

// Password strength rule
const PW_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;

// Helper: Send OTP async
function sendOtpInBackground(email, otp, subject = "Eduoding OTP Verification") {
  sendOTP(email, otp, subject)
    .then(() => console.log(`✅ OTP email sent to ${email}`))
    .catch((err) =>
      console.error(`❌ OTP email failed to ${email}:`, err.message || err)
    );
}

// -------------------------------
// Register
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

    let existing = await User.findOne({ email });
    if (existing) {
      if (!existing.isVerified) {
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        existing.otp = otp;
        existing.otpExpires = Date.now() + 5 * 60 * 1000;
        await existing.save();
        sendOtpInBackground(email, otp);
        if (process.env.SHOW_OTP_IN_RESPONSE === "true") {
          return res.json({ message: "OTP resent (dev).", otp });
        }
        return res.json({ message: "OTP resent. Please verify." });
      }
      return res.status(409).json({ message: "User already exists" });
    }

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
    sendOtpInBackground(email, otp);

    if (user.requestedUploader) {
      notifyAdminsAboutUploaderRequest(user).catch((e) =>
        console.error("notifyAdmins error:", e.message || e)
      );
    }

    if (process.env.SHOW_OTP_IN_RESPONSE === "true") {
      return res.status(201).json({ message: "User created. OTP will be sent.", otp });
    }

    res.status(201).json({ message: "User created. OTP will be sent to your email." });
  } catch (err) {
    console.error("registerUser error:", err.message || err);
    res.status(500).json({ message: err.message || "Server error" });
  }
};

// -------------------------------
// Verify OTP
export const verifyOTP = async (req, res) => {
  try {
    const email = (req.body.email || "").toLowerCase().trim();
    const otp = (req.body.otp || "").toString().trim();

    if (!email || !otp) return res.status(400).json({ message: "email and otp required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });

    if (
      !user.otp ||
      user.otp.toString() !== otp.toString() ||
      (user.otpExpires && user.otpExpires < Date.now())
    ) {
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
    if (!user.isVerified)
      return res.status(400).json({ message: "Please verify your email first" });

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
    const { email: rawEmail } = req.body;
    const email = (rawEmail || "").toLowerCase().trim();

    if (!email) return res.status(400).json({ message: "Email is required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });

    const resetOtp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = resetOtp;
    user.otpExpires = Date.now() + 5 * 60 * 1000;
    await user.save();

    sendOtpInBackground(email, resetOtp, "Password Reset OTP");

    if (process.env.SHOW_OTP_IN_RESPONSE === "true") {
      return res.json({ message: "Reset OTP generated (dev).", otp: resetOtp });
    }

    res.json({ message: "Reset OTP sent to your email (if delivery succeeds)." });
  } catch (err) {
    console.error("forgotPassword error:", err.message || err);
    res.status(500).json({ message: err.message || "Server error" });
  }
};

// -------------------------------
// Reset Password (updated)
export const resetPassword = async (req, res) => {
  try {
    const { email: rawEmail, otp, newPassword } = req.body;
    const email = (rawEmail || "").toLowerCase().trim();

    if (!email || !otp || !newPassword)
      return res.status(400).json({ message: "email, otp, and newPassword required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    if (
      !user.otp ||
      user.otp.toString() !== otp.toString() ||
      (user.otpExpires && user.otpExpires < Date.now())
    ) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    if (!PW_REGEX.test(newPassword)) {
      return res.status(400).json({
        message:
          "Weak password: must include 1 uppercase, 1 lowercase, 1 number, and 1 special character",
      });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.otp = null;
    user.otpExpires = null;
    await user.save();

    console.log(`✅ Password reset successful for ${email}`);
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
