// server/utils/sendEmail.js
import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false, // use TLS STARTTLS
    auth: {
      user: process.env.SMTP_USER || process.env.EMAIL_USER,
      pass: process.env.SMTP_PASS || process.env.EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
};

export const transporter = createTransporter();

export const verifyTransporter = async () => {
  try {
    await transporter.verify();
    console.log("✅ Mail transporter verified");
  } catch (err) {
    console.error("❌ Mail transporter verification failed:", err.message || err);
  }
};

const sendEmail = async ({ to, subject, text, html }) => {
  if (!to) throw new Error("Missing `to` in sendEmail");
  const mail = {
    from: `"Eduoding" <${process.env.SMTP_USER || process.env.EMAIL_USER}>`,
    to,
    subject,
    text,
    html,
  };
  const info = await transporter.sendMail(mail);
  return info;
};

export const sendOTP = async (email, otp, subject = "Your OTP Code - Eduoding") => {
  const html = `<h2>Your OTP is <b>${otp}</b></h2><p>Valid for 5 minutes.</p>`;
  return sendEmail({ to: email, subject, html, text: `Your OTP is ${otp}` });
};

export default sendEmail;
