// server/controllers/certController.js  (ESM)
import puppeteer from "puppeteer";
import { v4 as uuidv4 } from "uuid";
import Certificate from "../models/certificateModel.js";
import { uploadPDFBuffer } from "../utils/upload.js"; // must exist (ESM)
import path from "path";

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

/* HTML template */
function generateCertificateHTML({ name, courseTitle, score, issuedAt, id, logoUrl }) {
  const issuedStr = issuedAt ? new Date(issuedAt).toLocaleDateString() : "";
  return `<!doctype html>
  <html>
  <head><meta charset="utf-8"/><title>Certificate</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Inter:wght@300;400;600;700;800&display=swap');
    :root{--accent:#057A75;--muted:#6b7280}
    html,body{height:100%;margin:0;padding:0;background:#f6fafb;font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial}
    .page{width:900px;height:1270px;margin:36px auto;background:#fff;padding:60px;box-sizing:border-box;position:relative}
    .header{display:flex;align-items:center;gap:20px}
    .logo{width:84px;height:84px;border-radius:8px;overflow:hidden;background:#fff;display:flex;align-items:center;justify-content:center}
    .logo img{width:100%;height:100%;object-fit:cover}
    .title{font-family:'DM Serif Display',serif;font-size:42px;color:#0b2540}
    .sub{color:var(--muted);margin-top:8px;font-size:14px}
    .main{text-align:center;margin-top:80px}
    .cert-label{color:var(--muted);font-size:16px}
    .name{font-size:44px;font-weight:700;margin-top:14px;color:#052b2b}
    .course{margin-top:18px;font-size:20px;color:#374151}
    .meta{margin-top:34px;color:var(--muted);font-size:14px}
    .footer{position:absolute;bottom:40px;left:60px;right:60px;display:flex;justify-content:space-between;align-items:center;font-size:13px;color:var(--muted)}
    .signature{text-align:center}
    .signature .line{border-top:1px solid #e6e6e6;width:280px;margin:0 auto;margin-bottom:6px}
    .badge{display:inline-block;background:linear-gradient(90deg,#6b7bff,#057A75);color:white;padding:6px 12px;border-radius:18px;font-weight:600}
    .id{font-family:monospace;letter-spacing:1px;background:#f3f4f6;padding:6px 10px;border-radius:6px}
  </style>
  </head>
  <body>
    <div class="page">
      <div class="header">
        <div class="logo">${logoUrl ? `<img src="${escapeHtml(logoUrl)}" alt="logo"/>` : `<svg width="48" height="48" viewBox="0 0 24 24" fill="none"><rect width="24" height="24" rx="6" fill="#e6f7f6"/></svg>`}</div>
        <div><div class="title">Eduoding Certificate</div><div class="sub">Practical learning. Real projects.</div></div>
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

        <div style="margin-top:56px;">
          <div class="signature">
            <div class="line"></div>
            <div style="font-size:14px;color:#111827;margin-top:6px;">Instructor / Eduoding</div>
          </div>
        </div>
      </div>

      <div class="footer">
        <div>Eduoding — Practical learning. Real projects.</div>
        <div><span class="badge">Verified</span></div>
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

    const html = generateCertificateHTML({
      name: `${user.name || user.username || user.email || "Participant"}`,
      courseTitle: course.title || course.name || `Course ${courseId || ""}`,
      score: score ?? null,
      issuedAt,
      id: certId,
      logoUrl: process.env.CERT_LOGO_URL || "",
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

    // Puppeteer: render PDF (wrapped so we get good error info)
    let pdfBuffer = null;
    try {
      const launchOpts = {
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
        headless: true,
      };
      // allow custom executable path if provided (Render or other hosts may require)
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
      const filename = `certificate-${targetUserId}-${courseId || "general"}-${Date.now()}.pdf`;
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

    await certDoc.save();

    return res.json({ success: true, pdfUrl, certificate: certDoc });
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
