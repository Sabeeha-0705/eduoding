// server/utils/notify.js
import sendEmail from "./sendEmail.js";
import dotenv from "dotenv";
dotenv.config();

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

export async function notifyAdminsAboutUpload(video, uploader) {
  if (!ADMIN_EMAILS.length) return;
  try {
    const subject = `New video uploaded: ${video.title}`;
    const html = `<p><strong>${uploader.email}</strong> uploaded <em>${video.title}</em>.</p>
      <p>Open the admin dashboard: <a href="${process.env.FRONTEND_URL || "#"}">${process.env.FRONTEND_URL || "dashboard"}</a></p>`;
    await sendEmail({ to: ADMIN_EMAILS.join(","), subject, text: `${uploader.email} uploaded "${video.title}"`, html });
    console.log("📩 Notification email sent to admins (upload)");
  } catch (err) {
    console.error("❌ Failed to send notification (upload):", err && err.message ? err.message : err);
  }
}

export async function notifyAdminsAboutUploaderRequest(user) {
  if (!ADMIN_EMAILS.length) return;
  try {
    const subject = `Uploader request: ${user.email}`;
    const html = `<p><strong>${user.email}</strong> (${user.username || "—"}) has requested uploader access.</p>
      <p>Review in admin panel: <a href="${process.env.FRONTEND_URL || "#"}">${process.env.FRONTEND_URL || "admin requests"}</a></p>`;
    await sendEmail({ to: ADMIN_EMAILS.join(","), subject, text: `${user.email} requested uploader access`, html });
    console.log("📩 Uploader request notification sent to admins");
  } catch (err) {
    console.error("❌ Failed to send uploader request notification:", err && err.message ? err.message : err);
  }
}
