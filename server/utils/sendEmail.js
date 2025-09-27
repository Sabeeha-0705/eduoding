// server/utils/sendEmail.js
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587,
  secure: false, // 587 -> false
  auth: {
    user: process.env.SMTP_USER || process.env.EMAIL_USER,
    pass: process.env.SMTP_PASS || process.env.EMAIL_PASS,
  },
});

// verify transporter helper (so deploy fails loudly if creds wrong)
export async function verifyTransporter() {
  try {
    // nodemailer.verify returns a promise
    await transporter.verify();
    console.log("📤 Email transporter verified");
  } catch (err) {
    console.error("❌ Email transporter verification failed:", err && err.message ? err.message : err);
    // rethrow so caller can handle (index.js can catch and log)
    throw err;
  }
}

// general send helper
export async function sendEmail({ to, subject, text, html }) {
  if (!to) throw new Error("Missing 'to' when sending email");
  await transporter.sendMail({
    from: `"Eduoding" <${process.env.SMTP_USER || process.env.EMAIL_USER}>`,
    to,
    subject,
    text,
    html,
  });
}

// OTP helper
export async function sendOTP(email, otp, subject = "Your OTP Code - Eduoding") {
  await sendEmail({
    to: email,
    subject,
    html: `<h2>Your OTP is <b>${otp}</b></h2><p>It will expire in 5 minutes.</p>`,
  });
}

export default sendEmail;
