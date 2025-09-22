// server/utils/notify.js
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export async function notifyAdminsAboutUpload(video, uploader) {
  if (!ADMIN_EMAILS.length) return;

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: false, // true only for port 465
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: `"Eduoding" <${process.env.SMTP_USER}>`,
      to: ADMIN_EMAILS,
      subject: `New video uploaded: ${video.title}`,
      text: `${uploader.email} uploaded "${video.title}". Check dashboard.`,
    });

    console.log("📩 Notification email sent to admins");
  } catch (err) {
    console.error("❌ Failed to send notification:", err.message);
  }
}
export async function notifyAdminsAboutUploaderRequest(user) {
  if (!ADMIN_EMAILS.length) return;
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: `"Eduoding" <${process.env.SMTP_USER}>`,
      to: ADMIN_EMAILS,
      subject: `Uploader Request: ${user.email}`,
      text: `${user.email} requested uploader access. Open admin dashboard to approve.`,
    });

    console.log("📩 Admins notified about uploader request");
  } catch (err) {
    console.error("❌ Failed to send uploader request notification:", err.message);
  }
}
