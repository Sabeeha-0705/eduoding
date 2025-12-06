// server/routes/certRoutes.js (ESM)
import express from "express";
import { generateCertificate, getMyCertificates } from "../controllers/certController.js";
import { authMiddleware } from "../middleware/authMiddleware.js"; // now provided as named export

const router = express.Router();

// generate (POST) - user must be authenticated
router.post("/generate", authMiddleware, generateCertificate);

// list my certs
router.get("/me", authMiddleware, getMyCertificates);

export default router;
