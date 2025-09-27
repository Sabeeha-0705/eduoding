// server/utils/sendEmail.js
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT || 587),
  secure: process.env.SMTP_SECURE === "true", // true for 465
  auth: {
    user: process.env.SMTP_USER || process.env.EMAIL_USER,
    pass: process.env.SMTP_PASS || process.env.EMAIL_PASS,
  },
});

// helper to verify transporter on startup
export async function verifyTransporter() {
  try {
    await transporter.verify();
    console.log("✅ SMTP transporter verified");
  } catch (err) {
    console.error("❌ SMTP transporter verification failed:", err && err.message ? err.message : err);
    // don't throw here (so server can still run) — but you can choose to re-throw in prod
    throw err;
  }
}

// general send helper (default export)
const sendEmail = async ({ to, subject, text, html, from }) => {
  const mailFrom = from || process.env.EMAIL_FROM || process.env.SMTP_USER || process.env.EMAIL_USER;
  try {
    const info = await transporter.sendMail({
      from: mailFrom,
      to,
      subject,
      text,
      html,
    });
    console.log("📩 Email sent:", subject, "->", to);
    return info;
  } catch (err) {
    console.error("❌ sendEmail error:", err && err.message ? err.message : err);
    throw err;
  }
};

// OTP helper
export const sendOTP = async (email, otp, subject = "Your OTP Code - Eduoding") => {
  const html = `<h2>Your OTP is: <b>${otp}</b></h2><p>Valid for 5 minutes.</p>`;
  return sendEmail({ to: email, subject, html });
};

export { transporter };
export default sendEmail;
