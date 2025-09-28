// server/utils/sendEmail.js
import nodemailer from "nodemailer";

const SMTP_HOST = process.env.SMTP_HOST || "smtp.gmail.com";
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_USER = process.env.SMTP_USER || process.env.EMAIL_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || process.env.EMAIL_PASS || "";
const SMTP_SECURE = process.env.SMTP_SECURE === "true"; // true for 465

let transporter = null;
let EMAIL_ENABLED = false; // export this so other modules can know

async function createTransporter() {
  // try to create transporter from env creds if provided
  if (SMTP_USER && SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
      tls: {
        // allow self-signed certs (useful for some hosts)
        rejectUnauthorized: false,
      },
    });

    try {
      await transporter.verify();
      console.log("✅ SMTP transporter verified (env credentials)");
      EMAIL_ENABLED = true;
      return transporter;
    } catch (err) {
      console.error("❌ SMTP verify failed with env creds:", err && err.message ? err.message : err);
      // fallthrough to try Ethereal
    }
  }

  // fallback: create an Ethereal (test) account (dev only)
  try {
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    await transporter.verify();
    console.log("✅ Using Ethereal test account for emails. (dev only)");
    EMAIL_ENABLED = true;
    return transporter;
  } catch (err) {
    console.warn("⚠️ Ethereal creation failed or no SMTP available:", err && err.message ? err.message : err);
  }

  // last fallback: create a "null" transporter that just logs to console
  transporter = {
    sendMail: async (mailOptions) => {
      console.log("📨 (DEV FALLBACK) sendMail called with:", JSON.stringify(mailOptions, null, 2));
      // return object shaped similar to nodemailer result
      return { accepted: [mailOptions.to], messageId: "dev-fallback", envelope: mailOptions };
    },
    verify: async () => true,
  };
  EMAIL_ENABLED = false;
  return transporter;
}

// ensure transporter initialized at import (index.js can also call verifyTransporter)
let transporterPromise = createTransporter();

export async function verifyTransporter() {
  try {
    await transporterPromise;
    console.log("verifyTransporter: transporter ready");
  } catch (err) {
    console.error("verifyTransporter error:", err && err.message ? err.message : err);
    throw err;
  }
}

export async function sendEmail({ to, subject, text, html, from }) {
  const t = await transporterPromise;
  const mailOptions = {
    from: from || process.env.EMAIL_FROM || SMTP_USER || "no-reply@eduoding.app",
    to,
    subject,
    text,
    html,
  };
  try {
    const info = await t.sendMail(mailOptions);
    console.log("📩 Email send result:", info && info.messageId ? info.messageId : info);

    // if Ethereal, print preview url
    if (nodemailer.getTestMessageUrl && info && info.messageId) {
      const preview = nodemailer.getTestMessageUrl(info);
      if (preview) console.log("📬 Preview URL:", preview);
    }

    return { success: true, info };
  } catch (err) {
    console.error("❌ sendEmail error:", err && err.message ? err.message : err);
    return { success: false, error: err };
  }
}

// OTP helper that uses sendEmail underneath
export const sendOTP = async (email, otp, subject = "Your OTP Code - Eduoding") => {
  const html = `<h2>Your OTP is: <b>${otp}</b></h2><p>Valid for 5 minutes.</p>`;
  const r = await sendEmail({ to: email, subject, html });
  return r;
};

export { transporterPromise as transporterInit, EMAIL_ENABLED };
export default sendEmail;
