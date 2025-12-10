// server/controllers/certController.js  (ESM)
import puppeteer from "puppeteer";
import { v4 as uuidv4 } from "uuid";
import QRCode from "qrcode";
import Certificate from "../models/certificateModel.js";
import { uploadPDFBuffer } from "../utils/upload.js"; // must exist (ESM)

/* optional models (keep them optional) */
let User = null;
let Course = null;
try {
  User = (await import("../models/User.js")).default;
} catch (e) {
  /* ok - fallback to minimal info */
}
try {
  Course = (await import("../models/Course.js")).default;
} catch (e) {
  /* ok */
}

/* helper */
function escapeHtml(s = "") {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* make safe filename (basic) */
function safeFilename(name) {
  return name.replace(/[^a-z0-9._-]/gi, "_");
}

/* HTML template — improved 'professional' layout with QR embed */
function generateCertificateHTML({ name, courseTitle, score, issuedAt, id, logoUrl, verificationUrl, qrDataUrl }) {
  const issuedStr = issuedAt ? new Date(issuedAt).toLocaleDateString() : "";
  return `<!doctype html>
  <html>
  <head><meta charset="utf-8"/><title>Certificate</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Inter:wght@300;400;600;700;800&display=swap');
    :root{
      --accent:#057A75;
      --muted:#6b7280;
      --gold:#c69a2f;
      --bg:#f6fafb;
      --card:#ffffff;
    }
    html,body{height:100%;margin:0;padding:0;background:var(--bg);font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial}
    .outer{width:100%;display:flex;justify-content:center;padding:36px 0}
    .page{width:1000px;max-width:1000px;background:var(--card);padding:48px 56px;box-sizing:border-box;border-radius:8px;box-shadow:0 8px 30px rgba(2,6,23,0.08);position:relative; border:1px solid #e9eef2}
    /* decorative frame */
    .frame{position:absolute;inset:12px;border:4px solid #fff;pointer-events:none;border-radius:6px;box-shadow:inset 0 0 0 1px rgba(0,0,0,0.02)}
    .header{display:flex;align-items:center;gap:20px;margin-bottom:20px}
    .logo{width:96px;height:96px;border-radius:12px;overflow:hidden;background:#fff;display:flex;align-items:center;justify-content:center;border:1px solid #f0f3f4}
    .logo img{width:90%;height:90%;object-fit:contain}
    .title{font-family:'DM Serif Display',serif;font-size:42px;color:#0b2540}
    .sub{color:var(--muted);margin-top:4px;font-size:14px}
    .main{text-align:center;margin-top:40px}
    .cert-label{color:var(--muted);font-size:16px}
    .name{font-size:48px;font-weight:700;margin-top:12px;color:#052b2b}
    .course{margin-top:16px;font-size:20px;color:#374151}
    .meta{margin-top:30px;color:var(--muted);font-size:14px}
    .signature-wrap{display:flex;justify-content:space-between;align-items:center;margin-top:60px;padding:0 20px}
    .signature .line{border-top:1px solid #e6e6e6;width:320px;margin:0 auto;margin-bottom:6px}
    .signature .label{font-size:13px;color:#374151;margin-top:6px}
    .badge{display:inline-block;background:linear-gradient(90deg,var(--gold),#e0b84b);color:white;padding:6px 14px;border-radius:22px;font-weight:700;box-shadow:0 3px 10px rgba(198,154,47,0.18)}
    .id{font-family:monospace;letter-spacing:1px;background:#f3f4f6;padding:6px 10px;border-radius:6px}
    /* bottom area with QR */
    .bottom-row{display:flex;justify-content:space-between;align-items:center;margin-top:40px;padding-top:10px;border-top:1px dashed #eef3f6}
    .left-note{font-size:13px;color:var(--muted)}
    .qr-box{display:flex;align-items:center;gap:12px}
    .qr{width:110px;height:110px;border:6px solid #fff;border-radius:8px;box-shadow:0 6px 18px rgba(3,12,25,0.08);background:#fff;padding:6px;display:flex;align-items:center;justify-content:center}
    .verify{font-size:12px;color:var(--muted);text-align:center;max-width:140px}
    /* more professional accent */
    .ribbon{position:absolute;right:36px;top:36px;background:linear-gradient(90deg,var(--gold),#e0b84b);padding:8px 18px;border-radius:6px;color:#fff;font-weight:700;box-shadow:0 6px 18px rgba(198,154,47,0.15)}
    @media print { .page{box-shadow:none;border: none} .frame{display:none} }
  </style>
  </head>
  <body>
    <div class="outer">
      <div class="page">
        <div class="frame"></div>
        <div class="ribbon">CERTIFICATE</div>

        <div class="header">
          <div class="logo">${logoUrl ? `<img src="${escapeHtml(logoUrl)}" alt="logo"/>` : `<svg width="64" height="64" viewBox="0 0 24 24" fill="none"><rect width="24" height="24" rx="6" fill="#e6f7f6"/></svg>`}</div>
          <div>
            <div class="title">Eduoding Certificate</div>
            <div class="sub">Practical learning. Real projects.</div>
          </div>
        </div>

        <div class="main">
          <div class="cert-label">This certifies that</div>
          <div class="name">${escapeHtml(name || "Participant")}</div>
          <div class="course">has successfully completed the course</div>
          <div style="margin-top:12px;font-size:20px;font-weight:600;color:#0b2540;">"${escapeHtml(courseTitle || "Course")}"</div>

          <div class="meta">
            <div style="margin-top:24px;">
              <span>Issued: ${escapeHtml(issuedStr)}</span> &nbsp; • &nbsp;
              <span>Score: ${escapeHtml(String(score ?? "—"))}</span> &nbsp; • &nbsp;
              <span class="id">ID: ${escapeHtml(id)}</span>
            </div>
          </div>

          <div class="signature-wrap">
            <div style="text-align:left;">
              <div class="signature">
                <div class="line"></div>
                <div class="label">Instructor / Eduoding</div>
              </div>
            </div>

            <div style="text-align:right;">
              <div style="font-weight:700;color:#0b2540">Eduoding</div>
              <div style="font-size:12px;color:var(--muted)">www.eduoding.example</div>
            </div>
          </div>

          <div class="bottom-row">
            <div class="left-note">
              <div style="font-weight:600;color:#0b2540">Verified certificate</div>
              <div style="margin-top:6px;color:var(--muted);max-width:520px">Scan the QR or visit the verification link to confirm this certificate is authentic.</div>
            </div>

            <div class="qr-box" aria-hidden>
              <div class="qr">
                ${qrDataUrl ? `<img src="${escapeHtml(qrDataUrl)}" alt="QR code" style="width:100%;height:100%;object-fit:contain;border-radius:4px"/>` : ""}
              </div>
              <div class="verify">
                <div style="font-weight:700">Scan to verify</div>
                <div style="word-break:break-all;font-size:11px;color:var(--muted);margin-top:6px">${escapeHtml(verificationUrl)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </body></html>`;
}

/** POST /api/certificates/generate */
export async function generateCertificate(req, res) {
  try {
    const authUserId = req.user?.id || req.user?._id || null;
    const { userId, courseId, quizId, score, passed } = req.body || {};
    const targetUserId = userId || authUserId;
    if (!targetUserId) return res.status(401).json({ message: "Unauthorized" });

    // fetch user and course (optional)
    let user = null;
    if (User) user = await User.findById(targetUserId).lean();
    if (!user) {
      user = { name: req.body.name || req.body.username || "Student", _id: targetUserId };
    }

    let course = null;
    if (Course && courseId) course = await Course.findById(courseId).lean();
    if (!course) {
      course = { title: req.body.courseTitle || `Course ${courseId || ""}` };
    }

    const certId = uuidv4().slice(0, 12).toUpperCase();
    const issuedAt = new Date();

    // verification URL used in QR (frontend should implement verify route)
    const frontendBase = process.env.FRONTEND_URL || process.env.APP_URL || "";
    const verificationUrl = frontendBase ? `${frontendBase.replace(/\/$/, "")}/verify-certificate/${certId}` : `Certificate ID: ${certId}`;

    // build QR data URL (embed into HTML so PDF shows QR)
    let qrDataUrl = null;
    try {
      // small options to keep QR readable in PDF
      qrDataUrl = await QRCode.toDataURL(verificationUrl, { margin: 1, width: 300 });
    } catch (qrErr) {
      console.warn("QR generation failed:", qrErr);
      qrDataUrl = null;
    }

    const html = generateCertificateHTML({
      name: `${user.name || user.username || user.email || "Participant"}`,
      courseTitle: course.title || course.name || `Course ${courseId || ""}`,
      score: score ?? null,
      issuedAt,
      id: certId,
      logoUrl: process.env.CERT_LOGO_URL || "",
      verificationUrl,
      qrDataUrl,
    });

    // TEMP: allow skipping heavy PDF generation (useful during debugging or if Puppeteer fails on host)
    if (process.env.DISABLE_CERT_PDF === "true") {
      const certDoc = new Certificate({
        userId: targetUserId,
        courseId: courseId || (course && course._id) || String(courseId || ""),
        quizId: quizId || null,
        score: score ?? null,
        passed: typeof passed === "boolean" ? passed : (typeof score === "number" ? score >= 50 : true),
        pdfUrl: null,
        certificateId: certId,
      });
      await certDoc.save();
      return res.json({ success: true, pdfUrl: null, certificate: certDoc });
    }

    // Puppeteer: render PDF
    let pdfBuffer = null;
    try {
      const launchOpts = {
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
        headless: true,
      };
      if (process.env.PUPPETEER_EXECUTABLE_PATH) {
        launchOpts.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
      }
      const browser = await puppeteer.launch(launchOpts);
      const page = await browser.newPage();
      await page.setViewport({ width: 1200, height: 1600, deviceScaleFactor: 1 });
      await page.setContent(html, { waitUntil: "networkidle0" });
      pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: { top: "18mm", bottom: "18mm", left: "12mm", right: "12mm" },
      });
      await browser.close();
    } catch (puppErr) {
      console.error("Puppeteer PDF render failed:", puppErr);
      return res.status(500).json({
        message: "Failed to render certificate PDF",
        detail: puppErr?.message || String(puppErr),
      });
    }

    if (!pdfBuffer) {
      return res.status(500).json({ message: "PDF generation produced empty buffer" });
    }

    // Upload PDF buffer (cloudinary or s3)
    let uploadRes;
    try {
      const filename = safeFilename(`certificate-${targetUserId}-${courseId || "general"}-${Date.now()}.pdf`);
      uploadRes = await uploadPDFBuffer(pdfBuffer, filename);
    } catch (upErr) {
      console.error("uploadPDFBuffer failed:", upErr);
      return res.status(500).json({
        message: "Failed to upload certificate PDF",
        detail: upErr?.message || String(upErr),
      });
    }

    const pdfUrl = uploadRes?.url || uploadRes?.Location || uploadRes?.secure_url || null;

    // Save DB record
    const certDoc = new Certificate({
      userId: targetUserId,
      courseId: courseId || (course && course._id) || String(courseId || ""),
      quizId: quizId || null,
      score: score ?? null,
      passed: typeof passed === "boolean" ? passed : (typeof score === "number" ? score >= 50 : true),
      pdfUrl,
      certificateId: certId,
    });

    try {
      await certDoc.save();
    } catch (saveErr) {
      console.error("Saving certificate DB doc failed:", saveErr);
      return res.status(500).json({ message: "Failed to save certificate record", detail: saveErr?.message || String(saveErr) });
    }

    return res.json({ success: true, pdfUrl, certificate: certDoc, verificationUrl });
  } catch (err) {
    console.error("generateCertificate error:", err);
    return res.status(500).json({
      message: "Failed to generate certificate",
      detail: err?.message || String(err),
    });
  }
}

/** GET /api/certificates/me */
export async function getMyCertificates(req, res) {
  try {
    const authUserId = req.user?.id || req.user?._id;
    if (!authUserId) return res.status(401).json({ message: "Unauthorized" });
    const list = await Certificate.find({ userId: authUserId }).sort({ createdAt: -1 }).lean();
    return res.json(list);
  } catch (err) {
    console.error("getMyCertificates error:", err);
    return res.status(500).json({ message: "Failed to fetch certs" });
  }
}
