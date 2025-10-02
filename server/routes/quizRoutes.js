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

// GET quiz (unchanged)
router.get("/:courseId", protect, async (req, res) => {
  try {
    const quiz = await Quiz.findOne({ courseId: req.params.courseId });
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });
    res.json(quiz);
  } catch (err) {
    console.error("GET /quiz/:courseId error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// POST submit -> generate PDF certificate if passed
router.post("/:courseId/submit", protect, async (req, res) => {
  try {
    const { answers } = req.body;
    const quiz = await Quiz.findOne({ courseId: req.params.courseId });
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });

    // calculate percent
    let scoreCount = 0;
    quiz.questions.forEach((q, i) => {
      if (answers?.[i] === q.correctIndex) scoreCount++;
    });
    const percent = Math.round((scoreCount / quiz.questions.length) * 100);

    // failed
    if (percent < quiz.passPercent) {
      return res.json({ message: "Failed", score: percent });
    }

    // Passed -> create PDF
    const doc = new PDFDocument({ size: "A4", margin: 48 });
    const buffers = [];
    doc.on("data", (b) => buffers.push(b));
    doc.on("error", (err) => {
      console.error("PDFDocument error:", err);
    });

    // When finished, upload to cloudinary and save record
    doc.on("end", async () => {
      try {
        const pdfBuffer = Buffer.concat(buffers);
        const upload = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { resource_type: "raw", folder: "eduoding_certificates" },
            (error, result) => (error ? reject(error) : resolve(result))
          );
          stream.end(pdfBuffer);
        });

        const cert = await Certificate.create({
          userId: req.user.id,
          courseId: req.params.courseId,
          pdfUrl: upload.secure_url,
          score: percent,
          passed: true,
        });

        return res.json({ message: "Passed", score: percent, certificate: cert });
      } catch (err) {
        console.error("upload/save certificate error:", err);
        return res.status(500).json({ message: "Failed to upload/save certificate", error: err.message });
      }
    });

    // --- PDF layout (professional) ---
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;

    // thin inner border
    doc.save();
    doc.lineWidth(1).strokeColor("#e6e6e6");
    doc.rect(36, 36, pageWidth - 72, pageHeight - 72).stroke();
    doc.restore();

    // logo (top center) - prefer uploads/logo.png or set env CERT_LOGO_PATH
    const logoPath = process.env.CERT_LOGO_PATH || path.join(process.cwd(), "uploads", "logo.png");
    if (fs.existsSync(logoPath)) {
      try {
        const logoWidth = 140;
        doc.image(logoPath, pageWidth / 2 - logoWidth / 2, 70, { width: logoWidth });
      } catch (e) {
        console.warn("logo add failed:", e.message);
      }
    }

    // Title
    doc.moveDown(6);
    doc.font("Helvetica-Bold").fontSize(28).fillColor("#111827");
    doc.text("Eduoding Certificate", { align: "center" });

    doc.moveDown(1.2);
    doc.font("Helvetica").fontSize(12).fillColor("#444");
    doc.text("This certifies that", { align: "center" });

    doc.moveDown(0.6);

    // Recipient
    const recipient = req.user.username || req.user.name || req.user.email || "Student";
    doc.font("Helvetica-Bold").fontSize(20).fillColor("#111");
    doc.text(recipient, { align: "center" });

    doc.moveDown(0.8);

    // Course
    doc.font("Helvetica").fontSize(14).fillColor("#333");
    doc.text("has successfully completed the course", { align: "center" });
    doc.moveDown(0.3);
    doc.font("Helvetica-Bold").fontSize(16).text(`"${quiz.title}"`, { align: "center" });

    doc.moveDown(2);

    // meta row
    const issuedAt = new Date();
    const issuedDate = issuedAt.toLocaleDateString();
    const certId = `ED-${Date.now().toString(36).toUpperCase().slice(-8)}`;
    doc.font("Helvetica").fontSize(11).fillColor("#555");
    doc.text(`Issued: ${issuedDate}   •   Score: ${percent}%   •   ID: ${certId}`, { align: "center" });

    doc.moveDown(4);

    // signature line: signature image optional
    const sigImg = process.env.CERT_SIGNATURE_PATH || path.join(process.cwd(), "uploads", "signature.png");
    const sigLineY = doc.y;
    const sigLineWidth = pageWidth / 2;
    const sigLineX = pageWidth / 2 - sigLineWidth / 2;
    doc.moveTo(sigLineX, sigLineY).lineTo(sigLineX + sigLineWidth, sigLineY).stroke("#999");
    doc.font("Helvetica").fontSize(11).text("Instructor / Eduoding", sigLineX, sigLineY + 6, { width: sigLineWidth, align: "center" });

    if (fs.existsSync(sigImg)) {
      try {
        // draw signature above the line, scaled
        doc.image(sigImg, sigLineX + 20, sigLineY - 36, { width: 120 });
      } catch (e) { /* ignore */ }
    }

    // Footer small text
    doc.moveDown(6);
    doc.font("Helvetica").fontSize(9).fillColor("#777");
    doc.text("Eduoding — Practical learning. Real projects. https://eduoding.com", { align: "center" });

    // finalize
    doc.end();
  } catch (err) {
    console.error("POST /quiz/:courseId/submit error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// GET all user certificates (existing)
router.get("/certificates/all", protect, async (req, res) => {
  try {
    const certs = await Certificate.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(certs);
  } catch (err) {
    console.error("GET /quiz/certificates/all error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

export default router;
