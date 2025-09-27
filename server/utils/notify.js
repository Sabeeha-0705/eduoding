// server/utils/notify.js
import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: false,
    auth: {
      user: process.env.SMTP_USER || process.env.EMAIL_USER,
      pass: process.env.SMTP_PASS || process.env.EMAIL_PASS,
    },
  });
};

export async function notifyAdminsAboutUpload(video, uploader) {
  if (!ADMIN_EMAILS.length) {
    console.log("No ADMIN_EMAILS configured — skipping upload notification");
    return;
  }
  try {
    const transporter = createTransporter();
    await transporter.sendMail({
      from: `"Eduoding" <${process.env.SMTP_USER || process.env.EMAIL_USER}>`,
      to: ADMIN_EMAILS,
      subject: `New video uploaded: ${video.title || "Untitled"}`,
      text: `${uploader.email || "Unknown"} uploaded "${video.title || "Untitled"}". Check admin panel.`,
    });
    console.log("📩 Notification email sent to admins (upload)");
  } catch (err) {
    console.error("❌ Failed to send notification (upload):", err && err.message ? err.message : err);
  }
}

export async function notifyAdminsAboutUploaderRequest(user) {
  if (!ADMIN_EMAILS.length) {
    console.log("No ADMIN_EMAILS configured — skipping uploader request notification");
    return;
  }
  try {
    const transporter = createTransporter();
    const subject = `Uploader request: ${user.email}`;
    const text = `${user.email} (${user.username || "—"}) requested uploader access. Review admin panel.`;
    await transporter.sendMail({
      from: `"Eduoding" <${process.env.SMTP_USER || process.env.EMAIL_USER}>`,
      to: ADMIN_EMAILS,
      subject,
      text,
    });
    console.log("📩 Uploader request notification sent to admins");
  } catch (err) {
    console.error("❌ Failed to send uploader request notification:", err && err.message ? err.message : err);
  }
}
