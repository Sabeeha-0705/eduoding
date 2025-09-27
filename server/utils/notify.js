// server/utils/notify.js
import sendEmail from "./sendEmail.js";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

// notify admins about new uploaded video
export async function notifyAdminsAboutUpload(video, uploader) {
  if (!ADMIN_EMAILS.length) {
    console.log("notify: no ADMIN_EMAILS configured");
    return;
  }
  try {
    const subject = `New video uploaded: ${video.title || "untitled"}`;
    const text = `${uploader.email} uploaded "${video.title || "untitled"}". Check admin dashboard.`;
    await sendEmail({
      to: ADMIN_EMAILS.join(","),
      subject,
      text,
    });
    console.log("📩 Notification email sent to admins (upload)");
  } catch (err) {
    console.error("❌ Failed to send notification (upload):", err && err.message ? err.message : err);
  }
}

// notify when a user requests uploader role
export async function notifyAdminsAboutUploaderRequest(user) {
  if (!ADMIN_EMAILS.length) {
    console.log("notify uploader request: no ADMIN_EMAILS configured");
    return;
  }
  try {
    const subject = `Uploader request: ${user.email}`;
    const text = `${user.email} (${user.username || "—"}) has requested uploader access. Review in admin panel.`;
    await sendEmail({
      to: ADMIN_EMAILS.join(","),
      subject,
      text,
    });
    console.log("📩 Uploader request notification sent to admins");
  } catch (err) {
    console.error("❌ Failed to send uploader request notification:", err && err.message ? err.message : err);
  }
}
