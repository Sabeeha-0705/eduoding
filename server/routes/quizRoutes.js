// server/routes/quizRoutes.js
import express from "express";
import Quiz from "../models/quizModel.js";
import Certificate from "../models/certificateModel.js";
import protect from "../middleware/authMiddleware.js";
import PDFDocument from "pdfkit";
import cloudinary from "../utils/cloudinary.js";

const router = express.Router();

// Get quiz for a course
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

// Submit quiz answers
router.post("/:courseId/submit", protect, async (req, res) => {
  try {
    const { answers } = req.body;
    const quiz = await Quiz.findOne({ courseId: req.params.courseId });
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });

    // calculate score
    let score = 0;
    quiz.questions.forEach((q, i) => {
      if (answers && answers[i] === q.correctIndex) score++;
    });

    const percent = Math.round((score / quiz.questions.length) * 100);

    // if not passed respond
    if (percent < quiz.passPercent) {
      return res.json({ message: "Failed", score: percent });
    }

    // passed -> generate certificate PDF into buffer
    const doc = new PDFDocument();
    const buffers = [];

    doc.on("data", (chunk) => buffers.push(chunk));
    doc.on("error", (err) => {
      console.error("PDFDocument error:", err);
      if (!res.headersSent) {
        return res.status(500).json({ message: "Failed to generate certificate", error: err.message });
      }
    });

    doc.on("end", async () => {
      try {
        const pdfBuffer = Buffer.concat(buffers);

        // Upload buffer to Cloudinary (raw)
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

        // Save certificate record — include required fields to satisfy schema
        const cert = await Certificate.create({
          userId: req.user.id,
          courseId: req.params.courseId,
          pdfUrl: upload.secure_url,
          // include validation fields (your schema required these)
          passed: true,
          score: percent,
        });

        return res.json({
          message: "Passed",
          score: percent,
          certificate: cert,
        });
      } catch (uploadErr) {
        console.error("Certificate upload/save error:", uploadErr);
        if (!res.headersSent) {
          return res.status(500).json({ message: "Failed to upload/save certificate", error: uploadErr.message });
        }
      }
    });

    // Build PDF content
    doc.fontSize(24).text("Eduoding Certificate", { align: "center" });
    doc.moveDown();
    doc.fontSize(18).text(`This certifies that ${req.user.username || req.user.email}`, { align: "center" });
    doc.moveDown();
    doc.text(`has successfully completed Course "${quiz.title}"`, { align: "center" });
    doc.end();
  } catch (err) {
    console.error("POST /quiz/:courseId/submit error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Get all certificates for user
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
