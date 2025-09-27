// server/utils/sendEmail.js
import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

/**
 * Creates a transporter using environment variables.
 * Priority:
 * 1) If SMTP_HOST/SMTP_USER/SMTP_PASS present -> use generic SMTP (recommended for production)
 * 2) Else fallback to Gmail service using EMAIL_USER/EMAIL_PASS
 */

function makeTransporter() {
  // Use explicit SMTP if provided
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT || 587) === 465, // secure for 465
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  // Fallback: Gmail service (requires app password)
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }

  throw new Error("No mail transporter configured. Provide SMTP_* or EMAIL_* env variables.");
}

const transporter = makeTransporter();

/**
 * sendEmail({ to, subject, text, html })
 * - to can be string or comma-separated emails
 */
const sendEmail = async ({ to, subject, text, html }) => {
  try {
    const info = await transporter.sendMail({
      from: `"Eduoding" <${process.env.SMTP_USER || process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
      html,
    });
    console.log("📩 Email sent:", info.messageId || info.response);
    return info;
  } catch (err) {
    console.error("❌ sendEmail error:", err && err.message ? err.message : err);
    throw err;
  }
};

// Helper: send OTP
export const sendOTP = async (email, otp, subject = "Your OTP Code - Eduoding") => {
  return sendEmail({
    to: email,
    subject,
    html: `<h2>Your OTP is <b>${otp}</b></h2><p>It will expire in 5 minutes.</p>`,
    text: `Your OTP is ${otp} (valid for 5 minutes)`,
  });
};

export default sendEmail;
