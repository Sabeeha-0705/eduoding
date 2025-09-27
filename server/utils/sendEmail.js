// server/utils/sendEmail.js
import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: false, // true for 465
  auth: {
    user: process.env.SMTP_USER || process.env.EMAIL_USER,
    pass: process.env.SMTP_PASS || process.env.EMAIL_PASS,
  },
});

// general helper (default)
const sendEmail = async ({ to, subject, text, html }) => {
  if (!transporter) throw new Error("Mailer transporter not configured");
  await transporter.sendMail({
    from: `"Eduoding" <${process.env.SMTP_USER || process.env.EMAIL_USER}>`,
    to,
    subject,
    text,
    html,
  });
};

// named helper for OTP (used by authController)
export const sendOTP = async (email, otp, subject = "Your OTP Code - Eduoding") => {
  try {
    await sendEmail({
      to: email,
      subject,
      html: `<div style="font-family: Arial; line-height:1.4;">
               <h3>Your OTP code</h3>
               <p><strong>${otp}</strong></p>
               <p>This code expires in 5 minutes.</p>
             </div>`,
    });
  } catch (err) {
    // rethrow so caller can catch if needed, but include message
    throw new Error("sendOTP failed: " + (err && err.message ? err.message : err));
  }
};

export default sendEmail;
