// server/utils/notify.js
import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const createTransporter = () => {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }
  // fallback no-op transporter
  return {
    sendMail: async (opts) => {
      console.warn("notify: no smtp configured. Would send:", opts);
      return Promise.resolve({ accepted: [], info: "no-mail-config" });
    },
  };
};

const transporter = createTransporter();

export async function notifyAdminsAboutUpload(video, uploader) {
  if (!ADMIN_EMAILS.length) {
    console.log("notifyAdminsAboutUpload: no ADMIN_EMAILS configured");
    return;
  }

  try {
    await transporter.sendMail({
      from: `"Eduoding" <${process.env.SMTP_USER || process.env.EMAIL_USER || "no-reply@example.com"}>`,
      to: ADMIN_EMAILS,
      subject: `New video uploaded: ${video.title}`,
      text: `${uploader.email} uploaded "${video.title}". Check dashboard.`,
    });
    console.log("📩 Notification email sent to admins (upload)");
  } catch (err) {
    console.error("❌ Failed to send notification (upload):", err && err.message ? err.message : err);
    // swallow error so it doesn't crash main flow
  }
}

export async function notifyAdminsAboutUploaderRequest(user) {
  if (!ADMIN_EMAILS.length) {
    console.log("notifyAdminsAboutUploaderRequest: no ADMIN_EMAILS configured");
    return;
  }

  try {
    const subject = `Uploader request: ${user.email}`;
    const text = `${user.email} (${user.username || "—"}) has requested uploader access. Review in admin panel.`;

    await transporter.sendMail({
      from: `"Eduoding" <${process.env.SMTP_USER || process.env.EMAIL_USER || "no-reply@example.com"}>`,
      to: ADMIN_EMAILS,
      subject,
      text,
    });

    console.log("📩 Uploader request notification sent to admins");
  } catch (err) {
    console.error("❌ Failed to send uploader request notification:", err && err.message ? err.message : err);
    // swallow error
  }
}
