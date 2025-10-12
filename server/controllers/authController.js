// server/controllers/authController.js
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

// Password strength rule (same as frontend)
const PW_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;

// Helper: Send OTP async (fire-and-forget)
function sendOtpInBackground(email, otp, subject = "Eduoding OTP Verification") {
  sendOTP(email, otp, subject)
    .then(() => {
      if (process.env.NODE_ENV !== "production") {
        console.log(`✅ OTP email sent to ${email}`);
      }
    })
    .catch((err) =>
      console.error(
        `❌ OTP email failed to ${email}:`,
        err && err.message ? err.message : err
      )
    );
}

// -------------------------------
// Register
const registerUser = async (req, res) => {
  try {
    const { username, email: rawEmail, password, requestedUploader } = req.body;
    const email = (rawEmail || "").toLowerCase().trim();

    if (!username || !email || !password) {
      return res
        .status(400)
        .json({ message: "username, email and password required" });
    }

    if (!PW_REGEX.test(password)) {
      return res.status(400).json({
        message:
          "Password must include 1 uppercase, 1 lowercase, 1 number, and 1 special character",
      });
    }

    let existing = await User.findOne({ email });
    if (existing) {
      // If user exists but not verified — resend OTP
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
      requestedUploader:
        requestedUploader === true || requestedUploader === "true",
    });

    await user.save();

    // send OTP in background, don't block response
    sendOtpInBackground(email, otp);

    // notify admins for uploader request (fire-and-forget)
    if (user.requestedUploader) {
      notifyAdminsAboutUploaderRequest(user).catch((e) =>
        console.error("notifyAdmins error:", e && e.message ? e.message : e)
      );
    }

    if (process.env.SHOW_OTP_IN_RESPONSE === "true") {
      return res
        .status(201)
        .json({ message: "User created. OTP will be sent.", otp });
    }

    res
      .status(201)
      .json({ message: "User created. OTP will be sent to your email." });
  } catch (err) {
    console.error("registerUser error:", err && err.message ? err.message : err);
    res.status(500).json({ message: err.message || "Server error" });
  }
};

// -------------------------------
// Verify OTP
const verifyOTP = async (req, res) => {
  try {
    const email = (req.body.email || "").toLowerCase().trim();
    const otp = (req.body.otp || "").toString().trim();

    if (!email || !otp)
      return res.status(400).json({ message: "email and otp required" });

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
    // return token & user (safe)
    const safeUser = user.toObject();
    delete safeUser.password;
    delete safeUser.otp;
    delete safeUser.otpExpires;

    res.json({ message: "Email verified successfully!", token, user: safeUser });
  } catch (err) {
    console.error("verifyOTP error:", err && err.message ? err.message : err);
    res.status(500).json({ message: err.message || "Server error" });
  }
};

// -------------------------------
// Login
const loginUser = async (req, res) => {
  try {
    const { email: rawEmail, password } = req.body;
    const email = (rawEmail || "").toLowerCase().trim();

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });
    if (!user.isVerified)
      return res.status(400).json({ message: "Please verify your email first" });

    const isMatch = await bcrypt.compare(password, user.password || "");
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    const token = generateToken(user);
    const safeUser = user.toObject();
    delete safeUser.password;
    delete safeUser.otp;
    delete safeUser.otpExpires;

    res.json({ message: "Login successful", token, user: safeUser });
  } catch (err) {
    console.error("loginUser error:", err && err.message ? err.message : err);
    res.status(500).json({ message: err.message || "Server error" });
  }
};

// -------------------------------
// Forgot Password
const forgotPassword = async (req, res) => {
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
    console.error(
      "forgotPassword error:",
      err && err.message ? err.message : err
    );
    res.status(500).json({ message: err.message || "Server error" });
  }
};

// -------------------------------
// Reset Password
const resetPassword = async (req, res) => {
  try {
    const { email: rawEmail, otp, newPassword } = req.body;
    const email = (rawEmail || "").toLowerCase().trim();

    if (!email || !otp || !newPassword)
      return res
        .status(400)
        .json({ message: "email, otp, and newPassword required" });

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

    if (process.env.NODE_ENV !== "production") {
      console.log(`✅ Password reset successful for ${email}`);
    }

    res.json({ message: "✅ Password reset successful!" });
  } catch (err) {
    console.error("resetPassword error:", err && err.message ? err.message : err);
    res.status(500).json({ message: err.message || "Server error" });
  }
};

// -------------------------------
// Google Login
const googleLogin = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ message: "Token required" });

    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const email = (payload?.email || "").toLowerCase();
    const name = payload?.name || "GoogleUser";

    if (!email) {
      return res.status(400).json({ message: "Google account email missing" });
    }

    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        username: name,
        name: name,
        email,
        password: null,
        provider: "google",
        isVerified: true,
      });
    }

    const appToken = generateToken(user);
    const safeUser = user.toObject();
    delete safeUser.password;
    delete safeUser.otp;
    delete safeUser.otpExpires;

    res.json({ token: appToken, user: safeUser });
  } catch (error) {
    console.error("googleLogin error:", error && error.message ? error.message : error);
    res.status(500).json({ message: "Google login failed" });
  }
};

// -------------------------------
// Update Profile
// Prefer using `protect` middleware so req.user is present.
// If req.user is not present, fallback to verifying Authorization Bearer token.
const updateProfile = async (req, res) => {
  try {
    let userId = req.user?.id || req.user?._id || null;

    // Fallback: check Authorization header if protect middleware not used
    if (!userId) {
      const authHeader = req.headers.authorization || "";
      const token = authHeader.split(" ")[1];
      if (!token) return res.status(401).json({ message: "Unauthorized" });
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.id;
      } catch (e) {
        return res.status(401).json({ message: "Invalid token" });
      }
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Allowed fields to update (whitelist)
    const { username, name, avatar, theme } = req.body;

    if (typeof username !== "undefined" && username !== null) {
      user.username = String(username).trim();
    }

    // Persist name (critical)
    if (typeof name !== "undefined") {
      // store empty string if explicitly null/empty, otherwise trimmed value
      user.name = name === null ? "" : String(name).trim();
    }

    if (typeof avatar !== "undefined") {
      user.avatar = avatar;
    }

    if (typeof theme !== "undefined") {
      user.theme = theme;
    }

    await user.save();

    // FETCH FRESH user from DB to ensure latest stored values are returned
    const freshUser = await User.findById(user._id).select("-password -otp -otpExpires").lean();

    res.json({ message: "Profile updated", user: freshUser });
  } catch (err) {
    console.error("updateProfile error:", err && err.message ? err.message : err);
    res.status(500).json({ message: err.message || "Server error" });
  }
};

// Named exports only (no default)
export {
  registerUser,
  verifyOTP,
  loginUser,
  forgotPassword,
  resetPassword,
  googleLogin,
  updateProfile,
};
