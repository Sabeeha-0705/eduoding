// server/routes/quizRoutes.js
import express from "express";
import Quiz from "../models/quizModel.js";
import Certificate from "../models/certificateModel.js";
import protect from "../middleware/authMiddleware.js";
import PDFDocument from "pdfkit";
import cloudinary from "../utils/cloudinary.js";
import fs from "fs";
import path from "path";

const router = express.Router();

/**
 * GET /api/quiz/:courseId
 * Protected route - returns quiz for course
 */
router.get("/:courseId", protect, async (req, res) => {
  try {
    const quiz = await Quiz.findOne({ courseId: req.params.courseId });
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });
    return res.json(quiz);
  } catch (err) {
    console.error("GET /quiz/:courseId error:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
});

/**
 * POST /api/quiz/:courseId/submit
 * Protected route - submit answers, generate certificate on pass
 */
router.post("/:courseId/submit", protect, async (req, res) => {
  try {
    const { answers } = req.body;
    const quiz = await Quiz.findOne({ courseId: req.params.courseId });
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });

    const qLen = Array.isArray(quiz.questions) ? quiz.questions.length : 0;
    if (qLen === 0) {
      return res.status(400).json({ message: "Quiz has no questions" });
    }

    // calculate score (handle missing answers safely)
    let scoreCount = 0;
    for (let i = 0; i < qLen; i++) {
      const given = answers?.[i];
      const correct = quiz.questions[i]?.correctIndex;
      if (given !== undefined && given === correct) scoreCount++;
    }

    const percent = Math.round((scoreCount / qLen) * 100);
    const passed = percent >= (quiz.passPercent ?? 70); // fallback passPercent 70 if not set

    if (!passed) {
      return res.json({ message: "Failed", score: percent });
    }

    // Passed -> generate PDF
    const doc = new PDFDocument({ size: "A4", margin: 48 });
    const buffers = [];
    doc.on("data", (chunk) => buffers.push(chunk));
    doc.on("error", (err) => {
      console.error("PDFDocument error:", err);
      // If PDF generator fails, respond with server error
      // Note: returning inside 'error' handler won't automatically stop outer try/catch; we still rely on outer catch
    });

    // When PDF finished, upload buffer to Cloudinary and save Certificate
    doc.on("end", async () => {
      try {
        const pdfBuffer = Buffer.concat(buffers);

        // Upload to Cloudinary as raw file
        const upload = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { resource_type: "raw", folder: "eduoding_certificates" },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          );
          stream.end(pdfBuffer);
        });

        // Save certificate record with required fields
        const certId = `ED-${Date.now().toString(36).toUpperCase().slice(-8)}`;
        const cert = await Certificate.create({
          userId: req.user.id,
          courseId: req.params.courseId,
          quizId: quiz._id,
          pdfUrl: upload.secure_url,
          score: percent,
          passed: true,
          // optionally you can store certId in DB schema if you add field
          certId,
        });

        return res.json({
          message: "Passed",
          score: percent,
          certificate: cert,
        });
      } catch (uploadErr) {
        console.error("Certificate upload/save error:", uploadErr);
        return res.status(500).json({ message: "Failed to upload/save certificate", error: uploadErr.message });
      }
    });

    // ---------------- PDF layout ----------------
    // Optionally configure logo path via env
    const logoPath =
      process.env.CERT_LOGO_PATH || path.join(process.cwd(), "uploads", "logo.png");

    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;

    // Outer border
    doc.save();
    doc.lineWidth(1);
    doc.strokeColor("#DDDDDD");
    doc.rect(36, 36, pageWidth - 72, pageHeight - 72).stroke();
    doc.restore();

    // Header logo - top center (if exists)
    if (fs.existsSync(logoPath)) {
      try {
        const logoWidth = 120;
        const x = (pageWidth - logoWidth) / 2;
        doc.image(logoPath, x, 70, { width: logoWidth });
      } catch (e) {
        console.warn("Failed to draw logo:", e.message || e);
      }
    } else {
      if (process.env.CERT_LOGO_URL) {
        // If you have a remote logo URL and want to use it, download it into a buffer first
        // (not implemented here to keep route portable)
        console.warn("Logo not found locally; CERT_LOGO_URL present but remote fetch not implemented");
      } else {
        // no logo - continue
      }
    }

    // Title
    doc.moveDown(6);
    doc.font("Helvetica-Bold").fontSize(28).fillColor("#111827");
    doc.text("Eduoding Certificate", { align: "center" });
    doc.moveDown(1.2);

    // subtitle
    doc.font("Helvetica").fontSize(12).fillColor("#444");
    doc.text("This certifies that", { align: "center" });
    doc.moveDown(0.6);

    // recipient name
    const recipientName = req.user.username || req.user.name || req.user.email || "Student";
    doc.font("Helvetica-Bold").fontSize(20).fillColor("#111827");
    doc.text(recipientName, { align: "center" });
    doc.moveDown(0.9);

    // course title
    doc.font("Helvetica").fontSize(14).fillColor("#333");
    doc.text("has successfully completed the course", { align: "center" });
    doc.moveDown(0.5);
    doc.font("Helvetica-Bold").fontSize(16).fillColor("#111827");
    doc.text(`"${quiz.title}"`, { align: "center" });

    doc.moveDown(2);

    // metadata row: date | score | id
    const issuedAt = new Date();
    const issuedDate = issuedAt.toLocaleDateString();
    const certId = `ED-${Date.now().toString(36).toUpperCase().slice(-8)}`;

    doc.font("Helvetica").fontSize(11).fillColor("#555");
    const metaText = `Issued: ${issuedDate}    •    Score: ${percent}%    •    ID: ${certId}`;
    doc.text(metaText, { align: "center" });

    doc.moveDown(4);

    // signature line area
    const sigY = doc.y;
    const sigX = pageWidth / 4;
    const sigWidth = pageWidth / 2;
    doc.moveTo(sigX, sigY).lineTo(sigX + sigWidth, sigY).stroke("#999999");
    doc.fontSize(11).font("Helvetica");
    doc.text("Instructor / Eduoding", sigX, sigY + 6, { width: sigWidth, align: "center" });

    // footer text
    doc.moveDown(6);
    doc.fontSize(9).fillColor("#666666");
    doc.text("Eduoding — Practical learning. Real projects. https://eduoding.com", {
      align: "center",
    });

    // finalize PDF stream
    doc.end();
  } catch (err) {
    console.error("POST /quiz/:courseId/submit error:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
});

/**
 * GET /api/quiz/certificates/all
 * Protected - returns all certs for user
 */
router.get("/certificates/all", protect, async (req, res) => {
  try {
    const certs = await Certificate.find({ userId: req.user.id }).sort({ createdAt: -1 });
    return res.json(certs);
  } catch (err) {
    console.error("GET /quiz/certificates/all error:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
});

export default router;
