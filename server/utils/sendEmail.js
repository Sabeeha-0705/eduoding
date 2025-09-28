// server/utils/sendEmail.js
import nodemailer from "nodemailer";
import sgMail from "@sendgrid/mail";

const SENDGRID_KEY = process.env.SENDGRID_API_KEY || "";
const EMAIL_FROM = process.env.EMAIL_FROM || process.env.SMTP_USER || "no-reply@eduoding.app";

if (SENDGRID_KEY) {
  try {
    sgMail.setApiKey(SENDGRID_KEY);
    console.info("ℹ️ SendGrid configured");
  } catch (e) {
    console.warn("⚠️ SendGrid init failed:", e && e.message ? e.message : e);
  }
}

// nodemailer config (SMTP or Ethereal fallback)
const SMTP_HOST = process.env.SMTP_HOST || "smtp.gmail.com";
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_USER = process.env.SMTP_USER || process.env.EMAIL_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || process.env.EMAIL_PASS || "";
const SMTP_SECURE = process.env.SMTP_SECURE === "true";

let nodemailerTransporter = null;

// create/verify a transporter (returns transporter or null)
export async function verifyTransporter() {
  // prefer SendGrid as API (no nodemailer necessary) -> just return true if key present
  if (SENDGRID_KEY) {
    console.info("SendGrid API key present: true");
    return { type: "sendgrid" };
  }

  // if SMTP creds present -> create transporter
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
      console.info("✅ SMTP transporter verified (env credentials)");
      return { type: "smtp", transporter: nodemailerTransporter };
    } catch (err) {
      console.warn("⚠️ SMTP verify failed:", err && err.message ? err.message : err);
      nodemailerTransporter = null;
      // fallthrough to Ethereal
    }
  }

  // fallback: Ethereal (dev only)
  try {
    const testAccount = await nodemailer.createTestAccount();
    nodemailerTransporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: { user: testAccount.user, pass: testAccount.pass },
    });
    await nodemailerTransporter.verify();
    console.info("✅ Using Ethereal test account for emails (dev only).");
    return { type: "ethereal", transporter: nodemailerTransporter };
  } catch (err) {
    console.warn("⚠️ Ethereal creation failed:", err && err.message ? err.message : err);
  }

  // last fallback: fake transporter that logs
  nodemailerTransporter = {
    sendMail: async (opts) => {
      console.log("📨 (DEV FALLBACK) sendMail called:", JSON.stringify(opts, null, 2));
      return { accepted: [opts.to], messageId: "dev-fallback", envelope: opts };
    },
    verify: async () => true,
  };
  console.warn("⚠️ No real mailer available — using dev fallback.");
  return { type: "fallback", transporter: nodemailerTransporter };
}

// helper that ensures nodemailerTransporter exists and returns it
async function ensureNodemailer() {
  if (nodemailerTransporter) return nodemailerTransporter;
  const result = await verifyTransporter();
  if (result.transporter) {
    nodemailerTransporter = result.transporter;
  }
  return nodemailerTransporter;
}

// primary send email function
export default async function sendEmail({ to, subject, text, html, from }) {
  const fromAddr = from || EMAIL_FROM;
  // Prefer SendGrid if key present
  if (SENDGRID_KEY) {
    try {
      const msg = {
        to,
        from: fromAddr,
        subject: subject || "(no subject)",
        text: text || undefined,
        html: html || undefined,
      };
      // sgMail.send returns an array of responses for multiple recipients
      const res = await sgMail.send(msg);
      // res can be an array: check safely
      const status = Array.isArray(res) ? res[0]?.statusCode : res?.statusCode;
      console.log("📩 SendGrid send result:", status);
      return { success: true, provider: "sendgrid", info: res };
    } catch (err) {
      console.error("❌ SendGrid send error:", err && err.message ? err.message : err);
      // fall back to nodemailer automatically
    }
  }

  // nodemailer fallback
  try {
    const t = await ensureNodemailer();
    if (!t) throw new Error("No mail transporter available");

    const mailOptions = { from: fromAddr, to, subject, text, html };
    const info = await t.sendMail(mailOptions);
    console.log("📩 Nodemailer send result:", info && info.messageId ? info.messageId : info);

    // Ethereal preview (if present)
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

// convenience for OTP
export const sendOTP = async (email, otp, subject = "Your OTP Code - Eduoding") => {
  const html = `<div style="font-family: sans-serif; text-align:center;"><h2>Your OTP is <strong>${otp}</strong></h2><p>It expires in 5 minutes.</p></div>`;
  return await sendEmail({ to: email, subject, html });
};
