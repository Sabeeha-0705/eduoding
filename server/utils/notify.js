// server/utils/notify.js
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

// existing upload notification (keeps what you had)
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

    console.log("📩 Notification email sent to admins (upload)");
  } catch (err) {
    console.error("❌ Failed to send notification (upload):", err.message);
  }
}

// --- NEW: notify admins when a user requests uploader access
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

    const subject = `Uploader request: ${user.email}`;
    const text = `${user.email} (${user.username || "—"}) has requested uploader access. Review in admin panel.`;

    await transporter.sendMail({
      from: `"Eduoding" <${process.env.SMTP_USER}>`,
      to: ADMIN_EMAILS,
      subject,
      text,
    });

    console.log("📩 Uploader request notification sent to admins");
  } catch (err) {
    console.error("❌ Failed to send uploader request notification:", err.message);
  }
}
