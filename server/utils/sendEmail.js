// server/utils/sendEmail.js
import nodemailer from "nodemailer";

let EMAIL_FROM = process.env.EMAIL_FROM || process.env.SMTP_USER || "no-reply@eduoding.app";

// strip outer quotes if present (common deploy mistake)
if (EMAIL_FROM && ((EMAIL_FROM.startsWith('"') && EMAIL_FROM.endsWith('"')) || (EMAIL_FROM.startsWith("'") && EMAIL_FROM.endsWith("'")))) {
  EMAIL_FROM = EMAIL_FROM.slice(1, -1);
}

// SMTP configuration - REQUIRED for email sending
const SMTP_HOST = process.env.SMTP_HOST || "smtp.gmail.com";
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_USER = process.env.SMTP_USER || process.env.EMAIL_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || process.env.EMAIL_PASS || "";
const SMTP_SECURE = process.env.SMTP_SECURE === "true";

let nodemailerTransporter = null;

// create/verify a transporter using SMTP credentials
export async function verifyTransporter() {
  // Require SMTP credentials
  if (!SMTP_USER || !SMTP_PASS) {
    console.error("❌ SMTP credentials missing. Required: SMTP_USER and SMTP_PASS");
    console.error("   Current values - SMTP_USER:", SMTP_USER ? "***" : "MISSING", "SMTP_PASS:", SMTP_PASS ? "***" : "MISSING");
    throw new Error("SMTP credentials (SMTP_USER and SMTP_PASS) are required for email sending");
  }

  try {
    console.log("📧 Creating SMTP transporter with:", {
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      user: SMTP_USER,
      pass: SMTP_PASS ? "***" : "MISSING",
    });

    const t = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
      tls: { rejectUnauthorized: false },
    });

    // Verify transporter connection only in non-production
    // This prevents ETIMEDOUT errors on Render (production)
    // Email sending will still work - verification is just a startup check
    if (process.env.NODE_ENV !== "production") {
      try {
        await t.verify();
        console.info("✅ SMTP transporter verified successfully");
      } catch (verifyErr) {
        console.warn("⚠️ SMTP verification failed (non-production):", verifyErr?.message || verifyErr);
        console.warn("   Email sending may still work. This is just a connectivity check.");
      }
    } else {
      console.info("ℹ️ Skipping SMTP verification in production (prevents ETIMEDOUT on Render)");
      console.info("   Email transporter created. Verification skipped - email sending will work.");
    }

    nodemailerTransporter = t;
    console.info(`   Host: ${SMTP_HOST}:${SMTP_PORT}, User: ${SMTP_USER}, Secure: ${SMTP_SECURE}`);
    return { type: "smtp", transporter: nodemailerTransporter };
  } catch (err) {
    console.error("❌ SMTP transporter creation failed:", err?.message || err);
    if (err?.code) {
      console.error("   Error code:", err.code);
    }
    if (err?.response) {
      console.error("   Error response:", err.response);
    }
    nodemailerTransporter = null;
    throw new Error(`SMTP creation failed: ${err?.message || err}`);
  }
}

// helper that ensures nodemailerTransporter exists and returns it
async function ensureNodemailer() {
  if (nodemailerTransporter) {
    return nodemailerTransporter;
  }
  
  const result = await verifyTransporter();
  if (result && result.transporter) {
    nodemailerTransporter = result.transporter;
    return nodemailerTransporter;
  }
  
  throw new Error("No mail transporter available");
}

// primary send email function - uses ONLY SMTP via nodemailer
export default async function sendEmail({ to, subject, text, html, from }) {
  const fromAddr = from || EMAIL_FROM;

  // Validate required fields
  if (!to) {
    const error = "Email 'to' field is required";
    console.error("❌ sendEmail error:", error);
    return { success: false, error };
  }

  if (!subject) {
    const error = "Email 'subject' field is required";
    console.error("❌ sendEmail error:", error);
    return { success: false, error };
  }

  console.log("📨 Attempting to send email via SMTP:", {
    to,
    from: fromAddr,
    subject,
    host: SMTP_HOST,
    port: SMTP_PORT,
  });

  try {
    const t = await ensureNodemailer();
    if (!t) {
      const error = "No mail transporter available. SMTP credentials may be missing.";
      console.error("❌ sendEmail error:", error);
      return { success: false, error };
    }

    const mailOptions = {
      from: fromAddr,
      to,
      subject,
      text: text || undefined,
      html: html || undefined,
    };

    console.log("📤 Sending email...");
    const info = await t.sendMail(mailOptions);
    
    console.log("✅ Email sent successfully!");
    console.log("   Message ID:", info.messageId || "N/A");
    console.log("   Accepted recipients:", info.accepted || []);
    if (info.rejected && info.rejected.length > 0) {
      console.warn("   Rejected recipients:", info.rejected);
    }

    return { success: true, provider: "smtp", info };
  } catch (err) {
    const errorMessage = err?.message || err?.code || String(err);
    console.error("❌ Email sending failed!");
    console.error("   Error:", errorMessage);
    if (err?.code) {
      console.error("   Error code:", err.code);
    }
    if (err?.response) {
      console.error("   Error response:", err.response);
    }
    if (err?.command) {
      console.error("   Failed command:", err.command);
    }
    
    return {
      success: false,
      error: errorMessage,
      code: err?.code,
      response: err?.response,
    };
  }
}

// convenience for OTP
export const sendOTP = async (email, otp, subject = "Your OTP Code - Eduoding") => {
  const html = `<div style="font-family: sans-serif; text-align:center;"><h2>Your OTP is <strong>${otp}</strong></h2><p>It expires in 5 minutes.</p></div>`;
  const text = `Your OTP is ${otp}. It expires in 5 minutes.`;
  
  console.log(`📧 Sending OTP to ${email}`);
  const result = await sendEmail({ to: email, subject, html, text });
  
  if (result.success) {
    console.log(`✅ OTP email sent successfully to ${email}`);
  } else {
    console.error(`❌ Failed to send OTP email to ${email}:`, result.error);
  }
  
  return result;
};
