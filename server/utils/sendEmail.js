// server/utils/sendEmail.js
import nodemailer from "nodemailer";
import sgMail from "@sendgrid/mail";

const SENDGRID_KEY = (process.env.SENDGRID_API_KEY || "").trim();
let EMAIL_FROM = process.env.EMAIL_FROM || process.env.SMTP_USER || "no-reply@eduoding.app";

// strip outer quotes if present (common deploy mistake)
if (EMAIL_FROM && ((EMAIL_FROM.startsWith('"') && EMAIL_FROM.endsWith('"')) || (EMAIL_FROM.startsWith("'") && EMAIL_FROM.endsWith("'")))) {
  EMAIL_FROM = EMAIL_FROM.slice(1, -1);
}

// init sendgrid if key present
if (SENDGRID_KEY) {
  try {
    sgMail.setApiKey(SENDGRID_KEY);
    console.info("ℹ️ SendGrid configured (API)");
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

// create/verify a transporter (returns transporter info)
export async function verifyTransporter() {
  // 1) If SendGrid API key present - signal it's available
  if (SENDGRID_KEY) {
    console.info("SendGrid API key present: true (API preferred)");
    // Also attempt to create a nodemailer transporter using SendGrid SMTP as fallback
    try {
      const t = nodemailer.createTransport({
        host: "smtp.sendgrid.net",
        port: 587,
        secure: false,
        auth: { user: "apikey", pass: SENDGRID_KEY },
        tls: { rejectUnauthorized: false },
      });
      await t.verify();
      nodemailerTransporter = t;
      console.info("✅ Nodemailer SendGrid SMTP verified as fallback");
      return { type: "sendgrid-smtp", transporter: nodemailerTransporter };
    } catch (err) {
      console.warn("⚠️ SendGrid SMTP verify failed:", err && err.message ? err.message : err);
      // continue to other attempts
    }
    // Return that API exists (don't fail startup just because SMTP failed)
    return { type: "sendgrid-api" };
  }

  // 2) If explicit SMTP credentials provided (e.g., Gmail app password)
  if (SMTP_USER && SMTP_PASS) {
    try {
      const t = nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: SMTP_SECURE,
        auth: { user: SMTP_USER, pass: SMTP_PASS },
        tls: { rejectUnauthorized: false },
      });
      await t.verify();
      nodemailerTransporter = t;
      console.info("✅ SMTP transporter verified (env credentials)");
      return { type: "smtp", transporter: nodemailerTransporter };
    } catch (err) {
      console.warn("⚠️ SMTP verify failed:", err && err.message ? err.message : err);
      nodemailerTransporter = null;
      // fallthrough to Ethereal
    }
  }

  // 3) Ethereal fallback (dev only)
  try {
    const testAccount = await nodemailer.createTestAccount();
    const t = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: { user: testAccount.user, pass: testAccount.pass },
    });
    await t.verify();
    nodemailerTransporter = t;
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
  if (result && result.transporter) {
    nodemailerTransporter = result.transporter;
    return nodemailerTransporter;
  }
  // if SendGrid API only, nodemailerTransporter may still be null -> return null to indicate
  return nodemailerTransporter;
}

// primary send email function
export default async function sendEmail({ to, subject, text, html, from }) {
  const fromAddr = from || EMAIL_FROM;

  // Prefer SendGrid API if key present
  if (SENDGRID_KEY) {
    try {
      const msg = {
        to,
        from: fromAddr,
        subject: subject || "(no subject)",
        text: text || undefined,
        html: html || undefined,
      };
      const res = await sgMail.send(msg);
      const status = Array.isArray(res) ? res[0]?.statusCode : res?.statusCode;
      console.log("📩 SendGrid send result:", status);
      return { success: true, provider: "sendgrid", info: res };
    } catch (err) {
      // Log full response body if available (very important for debugging)
      console.error("❌ SendGrid send error:", err && err.message ? err.message : err);
      if (err && err.response && err.response.body) {
        console.error("❌ SendGrid response body:", JSON.stringify(err.response.body, null, 2));
      }
      // continue to nodemailer fallback automatically
    }
  }

  // nodemailer fallback (SendGrid SMTP or other SMTP or ethereal)
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
    // For nodemailer errors (connection timeout, auth failure), print details
    console.error("❌ sendEmail error:", err && (err.message || err.code) ? (err.message || err.code) : err);
    // If err has response or stack provide that too
    if (err && err.response) {
      console.error("❌ Transporter response:", JSON.stringify(err.response, null, 2));
    }
    return { success: false, error: err && (err.message || err) ? (err.message || err) : err };
  }
}

// convenience for OTP
export const sendOTP = async (email, otp, subject = "Your OTP Code - Eduoding") => {
  const html = `<div style="font-family: sans-serif; text-align:center;"><h2>Your OTP is <strong>${otp}</strong></h2><p>It expires in 5 minutes.</p></div>`;
  return await sendEmail({ to: email, subject, html });
};
