import nodemailer from "nodemailer";
import sgMail from "@sendgrid/mail";

const SENDGRID_KEY = process.env.SENDGRID_API_KEY || "";
const EMAIL_FROM =
  process.env.EMAIL_FROM || process.env.SMTP_USER || "no-reply@eduoding.app";

// If SendGrid key present, init
if (SENDGRID_KEY) {
  sgMail.setApiKey(SENDGRID_KEY);
}

// nodemailer config (used as fallback or for SMTP path)
const SMTP_HOST = process.env.SMTP_HOST || "smtp.gmail.com";
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_USER = process.env.SMTP_USER || process.env.EMAIL_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || process.env.EMAIL_PASS || "";
const SMTP_SECURE = process.env.SMTP_SECURE === "true";

let nodemailerTransporter = null;

// create nodemailer transporter only if creds present or for Ethereal
async function ensureNodemailer() {
  if (nodemailerTransporter) return nodemailerTransporter;

  if (SMTP_USER && SMTP_PASS) {
    nodemailerTransporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
      tls: { rejectUnauthorized: false },
    });

    try {
      await nodemailerTransporter.verify();
      console.log("✅ SMTP transporter verified (env credentials)");
      return nodemailerTransporter;
    } catch (err) {
      console.warn("⚠️ SMTP verify failed:", err?.message || err);
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
    console.log("✅ Using Ethereal test account (dev only).");
    return nodemailerTransporter;
  } catch (err) {
    console.warn("⚠️ Ethereal creation failed:", err?.message || err);
  }

  // last fallback: dummy
  nodemailerTransporter = {
    sendMail: async (opts) => {
      console.log("📨 (DEV FALLBACK) sendMail called:", JSON.stringify(opts, null, 2));
      return { accepted: [opts.to], messageId: "dev-fallback", envelope: opts };
    },
    verify: async () => true,
  };
  return nodemailerTransporter;
}

// ✅ This is the function missing earlier
export async function verifyTransporter() {
  try {
    if (SENDGRID_KEY) {
      console.log("✅ SendGrid ready");
      return true;
    }
    const t = await ensureNodemailer();
    await t.verify();
    console.log("✅ Nodemailer ready");
    return true;
  } catch (err) {
    console.error("❌ verifyTransporter error:", err?.message || err);
    return false;
  }
}

// Send via SendGrid if key exists; otherwise nodemailer fallback
export async function sendEmail({ to, subject, text, html, from }) {
  const fromAddr = from || EMAIL_FROM;

  if (SENDGRID_KEY) {
    try {
      const msg = { to, from: fromAddr, subject, text, html };
      const res = await sgMail.send(msg);
      console.log(
        "📩 SendGrid send result:",
        Array.isArray(res) ? res[0].statusCode : res.statusCode
      );
      return { success: true, info: res };
    } catch (err) {
      console.error("❌ SendGrid send error:", err?.message || err);
    }
  }

  try {
    const t = await ensureNodemailer();
    const info = await t.sendMail({ from: fromAddr, to, subject, text, html });
    console.log("📩 Nodemailer send result:", info?.messageId || info);
    if (nodemailer.getTestMessageUrl && info?.messageId) {
      console.log("📬 Preview URL:", nodemailer.getTestMessageUrl(info));
    }
    return { success: true, info };
  } catch (err) {
    console.error("❌ sendEmail error:", err?.message || err);
    return { success: false, error: err };
  }
}

// OTP helper
export const sendOTP = async (email, otp, subject = "Your OTP Code - Eduoding") => {
  const html = `<div style="font-family: sans-serif; text-align:center;">
    <h2>Your OTP is <strong>${otp}</strong></h2>
    <p>It expires in 5 minutes.</p>
  </div>`;
  return await sendEmail({ to: email, subject, html });
};

export default sendEmail;
