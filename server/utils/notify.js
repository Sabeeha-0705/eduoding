import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

// 🔹 Upload notification
export async function notifyAdminsAboutUpload(video, uploader) {
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
      subject: `New video uploaded: ${video.title}`,
      text: `${uploader.email} uploaded "${video.title}". Check dashboard.`,
    });

    console.log("📩 Notification email sent to admins (upload)");
  } catch (err) {
    console.error("❌ Failed to send notification (upload):", err.message);
  }
}

// 🔹 Uploader request notification
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
      subject: `Uploader request: ${user.email}`,
      text: `${user.email} (${user.username || "—"}) has requested uploader access. Review in admin panel.`,
    });

    console.log("📩 Uploader request notification sent to admins");
  } catch (err) {
    console.error("❌ Failed to send uploader request notification:", err.message);
  }
}
