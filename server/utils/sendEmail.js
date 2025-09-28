// server/utils/sendEmail.js
import nodemailer from "nodemailer";
import sgMail from "@sendgrid/mail";

const SENDGRID_KEY = process.env.SENDGRID_API_KEY || "";
const EMAIL_FROM = process.env.EMAIL_FROM || process.env.SMTP_USER || "no-reply@eduoding.app";

// Initialize SendGrid client if key present
if (SENDGRID_KEY) {
  sgMail.setApiKey(SENDGRID_KEY);
  console.log("ℹ️ SendGrid configured");
}

// Nodemailer (SMTP) config
const SMTP_HOST = process.env.SMTP_HOST || "smtp.gmail.com";
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_USER = process.env.SMTP_USER || process.env.EMAIL_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || process.env.EMAIL_PASS || "";
const SMTP_SECURE = (process.env.SMTP_SECURE || "false").toLowerCase() === "true";

let nodemailerTransporter = null;
let nodemailerInitPromise = null;
let EMAIL_ENABLED = false; // helpful to check status from outside if needed

async function createNodemailerTransporter() {
  // Avoid recreating
  if (nodemailerTransporter) return nodemailerTransporter;

  // If SMTP creds provided, try to use them
  if (SMTP_USER && SMTP_PASS) {
    try {
      nodemailerTransporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: SMTP_SECURE,
        auth: { user: SMTP_USER, pass: SMTP_PASS },
        tls: { rejectUnauthorized: false },
      });
      await nodemailerTransporter.verify();
      console.log("✅ SMTP transporter verified (env credentials)");
      EMAIL_ENABLED = true;
      return nodemailerTransporter;
    } catch (err) {
      console.warn("⚠️ SMTP verify failed:", err && err.message ? err.message : err);
      // fallback to Ethereal
    }
  }

  // Use Ethereal for local dev if available
  try {
    const testAccount = await nodemailer.createTestAccount();
    nodemailerTransporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: { user: testAccount.user, pass: testAccount.pass },
    });
    await nodemailerTransporter.verify();
    console.log("✅ Using Ethereal test account for emails (dev only).");
    EMAIL_ENABLED = true;
    return nodemailerTransporter;
  } catch (err) {
    console.warn("⚠️ Ethereal creation failed (likely in prod env):", err && err.message ? err.message : err);
  }

  // Fallback: a noop transporter that logs
  nodemailerTransporter = {
    sendMail: async (opts) => {
      console.log("📨 (DEV FALLBACK) sendMail called:", JSON.stringify(opts, null, 2));
      return { accepted: [opts.to], messageId: "dev-fallback", envelope: opts };
    },
    verify: async () => true,
  };
  EMAIL_ENABLED = false;
  return nodemailerTransporter;
}

// Kick off nodemailer init in background (so startup won't block necessarily)
nodemailerInitPromise = createNodemailerTransporter().catch((e) => {
  console.warn("nodemailer init error:", e && e.message ? e.message : e);
});

// Provide a verifier export so other modules can wait if desired
export async function verifyTransporter() {
  try {
    await nodemailerInitPromise;
    return { ok: true };
  } catch (err) {
    console.error("verifyTransporter error:", err && err.message ? err.message : err);
    throw err;
  }
}

// Main sendEmail function:
// Prefer SendGrid when key available; otherwise use nodemailer fallback.
export async function sendEmail({ to, subject, text, html, from }) {
  const fromAddr = from || EMAIL_FROM;

  // 1) Try SendGrid
  if (SENDGRID_KEY) {
    try {
      const msg = {
        to,
        from: fromAddr,
        subject: subject || "(no subject)",
        text: text || undefined,
        html: html || undefined,
      };
      // sgMail.send returns an array for multiple recipients in some versions
      const res = await sgMail.send(msg);
      // log status (some versions return array)
      console.log("📩 SendGrid send result:", Array.isArray(res) ? res[0].statusCode : (res && res.statusCode) || res);
      return { success: true, provider: "sendgrid", info: res };
    } catch (err) {
      console.error("❌ SendGrid send error:", err && err.message ? err.message : err);
      // fallthrough to nodemailer fallback
    }
  }

  // 2) Nodemailer fallback
  try {
    const transporter = await createNodemailerTransporter();
    const mailOptions = { from: fromAddr, to, subject, text, html };
    const info = await transporter.sendMail(mailOptions);
    console.log("📩 Nodemailer send result:", info && info.messageId ? info.messageId : info);

    // Ethereal preview link if available
    if (nodemailer.getTestMessageUrl && info && info.messageId) {
      const preview = nodemailer.getTestMessageUrl(info);
      if (preview) console.log("📬 Preview URL:", preview);
    }

    return { success: true, provider: "nodemailer", info };
  } catch (err) {
    console.error("❌ sendEmail error:", err && err.message ? err.message : err);
    return { success: false, error: err };
  }
}

// Helper for OTP
export const sendOTP = async (email, otp, subject = "Your OTP Code - Eduoding") => {
  const html = `<div style="font-family: sans-serif; text-align:center;"><h2>Your OTP is <strong>${otp}</strong></h2><p>It expires in 5 minutes.</p></div>`;
  return await sendEmail({ to: email, subject, html });
};

// Exports
export { EMAIL_ENABLED, nodemailerInitPromise as transporterInit };
export default sendEmail;
