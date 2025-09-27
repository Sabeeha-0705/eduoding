// server/utils/notify.js
import { transporter } from "./sendEmail.js";
import dotenv from "dotenv";
dotenv.config();

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

export async function notifyAdminsAboutUpload(video, uploader) {
  if (!ADMIN_EMAILS.length) return;
  try {
    await transporter.sendMail({
      from: `"Eduoding" <${process.env.SMTP_USER || process.env.EMAIL_USER}>`,
      to: ADMIN_EMAILS,
      subject: `New video uploaded: ${video.title}`,
      text: `${uploader.email} uploaded "${video.title}". Check admin dashboard.`,
    });
    console.log("📩 Notification email sent to admins (upload)");
  } catch (err) {
    console.error("❌ Failed to send notification (upload):", err.message || err);
  }
}

export async function notifyAdminsAboutUploaderRequest(user) {
  if (!ADMIN_EMAILS.length) return;
  try {
    const subject = `Uploader request: ${user.email}`;
    const text = `${user.email} (${user.username || "—"}) requested uploader access. Review in admin panel.`;
    await transporter.sendMail({
      from: `"Eduoding" <${process.env.SMTP_USER || process.env.EMAIL_USER}>`,
      to: ADMIN_EMAILS,
      subject,
      text,
    });
    console.log("📩 Uploader request notification sent to admins");
  } catch (err) {
    console.error("❌ Failed to send uploader request notification:", err.message || err);
  }
}
