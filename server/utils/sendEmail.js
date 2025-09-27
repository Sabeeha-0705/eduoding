// server/utils/sendEmail.js
import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

// Create transporter using SMTP config if available, otherwise fallback to console-only
const createTransporter = () => {
  // Prefer explicit SMTP settings if provided
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false, // true for 465
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  // Fallback to Gmail config if present
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }

  // If no mail configured, return a dummy transporter which resolves but only logs
  return {
    sendMail: async (opts) => {
      console.warn("No SMTP configured — would send email:", opts);
      return Promise.resolve({ accepted: [], info: "no-mail-config" });
    },
  };
};

const transporter = createTransporter();

// general helper — safe (throws only if transporter sendMail throws, but we catch where we call)
const sendEmail = async ({ to, subject, text, html }) => {
  if (!transporter || typeof transporter.sendMail !== "function") {
    console.warn("sendEmail: transporter not configured, skipping email to:", to);
    return;
  }
  return transporter.sendMail({
    from: `"Eduoding" <${process.env.SMTP_USER || process.env.EMAIL_USER || "no-reply@example.com"}>`,
    to,
    subject,
    text,
    html,
  });
};

// helper to send OTP (lightweight)
export const sendOTP = async (email, otp, subject = "Your OTP Code - Eduoding") => {
  try {
    await sendEmail({
      to: email,
      subject,
      html: `<h2>Your OTP is <b>${otp}</b></h2><p>It will expire in 5 minutes.</p>`,
    });
    console.log(`OTP sent to ${email}`);
  } catch (err) {
    // don't crash app if email fails — caller should handle if OTP required
    console.error("sendOTP error:", err && err.message ? err.message : err);
    throw err; // rethrow if you want caller to react — caller in authController will catch
  }
};

export default sendEmail;
