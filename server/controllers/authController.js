import { OAuth2Client } from "google-auth-library";
import User from "../models/authModel.js";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import bcrypt from "bcryptjs";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// 🔹 Nodemailer transporter (Gmail)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// 🔹 Generate JWT helper
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );
};

// 🔹 Send OTP Email
const sendOTP = async (email, otp, subject = "Your OTP Code - Eduoding") => {
  await transporter.sendMail({
    from: `"Eduoding App" <${process.env.EMAIL_USER}>`,
    to: email,
    subject,
    html: `<h2>Your OTP is <b>${otp}</b></h2><p>It will expire in 5 minutes.</p>`,
  });
};

// -------------------------------
// 🔹 Normal Signup with OTP
export const registerUser = async (req, res) => {
  try {
    const { username, email, password } = req.body;

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
    });

    await user.save();

    // Send OTP via Gmail
    await sendOTP(email, otp);

    res.json({ message: "OTP sent to email. Please verify." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// -------------------------------
// 🔹 OTP Verification
// 🔹 OTP Verification
export const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });

    // Force string comparison
    if (user.otp?.toString() !== otp.toString() || user.otpExpires < Date.now()) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    user.isVerified = true;
    user.otp = null;
    user.otpExpires = null;
    await user.save();

    const token = generateToken(user);
    res.json({ message: "Email verified successfully!", token, user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// -------------------------------
// 🔹 Normal Login
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });

    if (!user.isVerified) {
      return res.status(400).json({ message: "Please verify your email first" });
    }

    // Compare hashed password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = generateToken(user);
    res.json({ message: "Login successful", token, user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// -------------------------------
// 🔹 Forgot Password (Send Reset OTP)
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });

    // Generate OTP
    const resetOtp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = resetOtp;
    user.otpExpires = Date.now() + 5 * 60 * 1000; // 5 mins
    await user.save();

    // Send OTP
    await sendOTP(email, resetOtp, "Password Reset OTP");

    res.json({ message: "Reset OTP sent to your email" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// -------------------------------
// 🔹 Reset Password
export const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    const user = await User.findOne({ email });

    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.otp !== otp || user.otpExpires < Date.now()) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);

    // Clear OTP
    user.otp = null;
    user.otpExpires = null;
    await user.save();

    res.json({ message: "✅ Password reset successful!" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// -------------------------------
// 🔹 Google Login
export const googleLogin = async (req, res) => {
  try {
    const { token } = req.body;

    // Verify Google token
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, name } = payload;

    // Check if user exists
    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        username: name,
        email,
        password: null,
        provider: "google",
        isVerified: true, // Google login = trusted
      });
    }

    // Generate our JWT
    const appToken = generateToken(user);

    res.json({ token: appToken, user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Google login failed" });
  }
};
