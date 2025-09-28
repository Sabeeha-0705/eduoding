// server/utils/sendEmail.js
import dotenv from "dotenv";
dotenv.config();

import sgMail from "@sendgrid/mail";
import nodemailer from "nodemailer";

const SENDGRID_KEY = process.env.SENDGRID_API_KEY;
const FROM_ADDR = process.env.EMAIL_FROM || process.env.SMTP_USER || "no-reply@eduoding.app";

let usingSendGrid = false;
let transporter = null;
let EMAIL_ENABLED = false;

async function initSendGrid() {
  if (!SENDGRID_KEY) return false;
  try {
    sgMail.setApiKey(SENDGRID_KEY);
    // test sendGrid by calling client (no direct verify fn) - we do a lightweight check by preparing a message
    // Note: we don't send test mail here. Assume key validity; errors will show when sending.
    usingSendGrid = true;
    EMAIL_ENABLED = true;
    console.log("✅ SendGrid enabled as primary email provider.");
    return true;
  } catch (err) {
    console.warn("⚠️ SendGrid init failed:", err && err.message ? err.message : err);
    usingSendGrid = false;
    return false;
  }
}

async function createNodemailerTransporterFromEnv() {
  const SMTP_HOST = process.env.SMTP_HOST || "smtp.gmail.com";
  const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
  const SMTP_USER = process.env.SMTP_USER || process.env.EMAIL_USER || "";
  const SMTP_PASS = process.env.SMTP_PASS || process.env.EMAIL_PASS || "";
  const SMTP_SECURE = process.env.SMTP_SECURE === "true";

  if (!SMTP_USER || !SMTP_PASS) return null;

  const t = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  try {
    await t.verify();
    console.log("✅ SMTP transporter verified (env credentials)");
    EMAIL_ENABLED = true;
    return t;
  } catch (err) {
    console.warn("⚠️ SMTP verify failed with env creds:", err && err.message ? err.message : err);
    return null;
  }
}

async function createEtherealTransporter() {
  try {
    const testAccount = await nodemailer.createTestAccount();
    const t = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    await t.verify();
    console.log("✅ Using Ethereal test account for emails. (dev only)");
    EMAIL_ENABLED = true;
    return t;
  } catch (err) {
    console.warn("⚠️ Ethereal creation failed:", err && err.message ? err.message : err);
    return null;
  }
}

async function createFallbackLoggerTransporter() {
  // dev fallback — just log the mail
  const logger = {
    sendMail: async (mailOptions) => {
      console.log("📨 (DEV FALLBACK) sendMail called with:", JSON.stringify(mailOptions, null, 2));
      return { accepted: [mailOptions.to], messageId: "dev-fallback", envelope: mailOptions };
    },
    verify: async () => true,
  };
  EMAIL_ENABLED = false;
  return logger;
}

/** Initialize the mail provider(s). Called on import. */
const initPromise = (async () => {
  // try SendGrid first
  if (await initSendGrid()) {
    // SendGrid does not require a nodemailer transporter.
    transporter = null;
    return;
  }

  // Otherwise try nodemailer env creds
  transporter = await createNodemailerTransporterFromEnv();
  if (transporter) return;

  // Ethereal dev account
  transporter = await createEtherealTransporter();
  if (transporter) return;

  // final fallback
  transporter = await createFallbackLoggerTransporter();
  return;
})();

export async function verifyTransporter() {
  await initPromise;
  if (usingSendGrid) {
    console.log("verifyTransporter: using SendGrid (no transporter verify needed)");
    return true;
  }
  if (!transporter) throw new Error("No email transporter available");
  return transporter.verify();
}

/**
 * sendEmail unified function:
 * if SendGrid key exists -> use SendGrid
 * else -> use nodemailer transporter (env/Ethereal/fallback)
 */
export async function sendEmail({ to, subject, text, html, from }) {
  await initPromise;
  const fromAddr = from || FROM_ADDR;

  if (usingSendGrid && SENDGRID_KEY) {
    const msg = {
      to,
      from: fromAddr,
      subject,
      text: text || undefined,
      html: html || undefined,
    };
    try {
      const res = await sgMail.send(msg);
      console.log("📩 SendGrid send OK:", (res && res[0] && res[0].statusCode) || "sent");
      return { success: true, info: res };
    } catch (err) {
      console.error("❌ SendGrid error:", err && err.response ? err.response.body : err);
      return { success: false, error: err };
    }
  }

  // fallback path: use transporter (nodemailer or dev logger)
  if (!transporter) {
    console.error("❌ No transporter available to send email.");
    return { success: false, error: new Error("No transporter available") };
  }

  const mailOptions = {
    from: fromAddr,
    to,
    subject,
    text,
    html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("📩 Nodemailer send result:", info && info.messageId ? info.messageId : info);
    // if Ethereal - print preview url
    try {
      const preview = nodemailer.getTestMessageUrl && nodemailer.getTestMessageUrl(info);
      if (preview) console.log("📬 Preview URL:", preview);
    } catch (e) {
      /* ignore */
    }
    return { success: true, info };
  } catch (err) {
    console.error("❌ sendEmail error:", err && err.message ? err.message : err);
    return { success: false, error: err };
  }
}

// OTP helper that uses sendEmail underneath
export const sendOTP = async (email, otp, subject = "Your OTP Code - Eduoding") => {
  const html = `<div style="font-family:Arial,sans-serif;line-height:1.4">
    <h2 style="margin:0 0 10px;">Your OTP is <strong>${otp}</strong></h2>
    <p style="margin:0;color:#666">It will expire in 5 minutes.</p>
  </div>`;
  const text = `Your OTP is ${otp}. It will expire in 5 minutes.`;
  return await sendEmail({ to: email, subject, text, html });
};

export { EMAIL_ENABLED, usingSendGrid as USING_SENDGRID };
export default sendEmail;
