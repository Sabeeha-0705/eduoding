// server/routes/quizRoutes.js
import express from "express";
import Quiz from "../models/quizModel.js";
import Certificate from "../models/certificateModel.js";
import protect from "../middleware/authMiddleware.js";
import PDFDocument from "pdfkit";
import cloudinary from "../utils/cloudinary.js"; // if you use Cloudinary

const router = express.Router();

// ✅ Get quiz for a course
router.get("/:courseId", protect, async (req, res) => {
  try {
    const quiz = await Quiz.findOne({ courseId: req.params.courseId });
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });
    res.json(quiz);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ✅ Submit quiz answers
router.post("/:courseId/submit", protect, async (req, res) => {
  try {
    const { answers } = req.body; // array of selected indices
    const quiz = await Quiz.findOne({ courseId: req.params.courseId });
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });

    let score = 0;
    quiz.questions.forEach((q, i) => {
      if (answers[i] === q.correctIndex) score++;
    });

    const percent = Math.round((score / quiz.questions.length) * 100);

    if (percent >= quiz.passPercent) {
      // ✅ Generate certificate PDF
      const doc = new PDFDocument();
      const buffers = [];
      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", async () => {
        const pdfBuffer = Buffer.concat(buffers);

        // ✅ Upload to Cloudinary
        const upload = await new Promise((resolve, reject) => {
          cloudinary.uploader.upload_stream(
            { resource_type: "raw", folder: "eduoding_certificates" },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          ).end(pdfBuffer);
        });

        // ✅ Save certificate record
        const cert = await Certificate.create({
          userId: req.user.id,
          courseId: req.params.courseId,
          pdfUrl: upload.secure_url,
        });

        res.json({
          message: "Passed",
          score: percent,
          certificate: cert,
        });
      });

      doc.fontSize(24).text("Eduoding Certificate", { align: "center" });
      doc.moveDown();
      doc.fontSize(18).text(`This certifies that ${req.user.username || req.user.email}`, {
  align: "center",
});

      doc.text(`has successfully completed Course ${quiz.title}`, {
        align: "center",
      });
      doc.end();
    } else {
      res.json({ message: "Failed", score: percent });
    }
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ✅ Get all certificates for user
router.get("/certificates/all", protect, async (req, res) => {
  try {
    const certs = await Certificate.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(certs);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

export default router;
