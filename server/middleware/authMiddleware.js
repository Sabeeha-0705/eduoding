// server/middleware/authMiddleware.js
import jwt from "jsonwebtoken";
import User from "../models/authModel.js";

/**
 * Protect middleware
 * - Accepts token from Authorization header "Bearer <token>"
 * - Also checks cookie "authToken" (optional)
 * - Verifies JWT and attaches user (without password) to req.user
 */
export const protect = async (req, res, next) => {
  let token;

  try {
    // 1) Authorization header: "Bearer <token>"
    if (
      req.headers?.authorization &&
      typeof req.headers.authorization === "string" &&
      req.headers.authorization.startsWith("Bearer ")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    // 2) fallback: cookie (optional)
    if (!token && req.cookies && req.cookies.authToken) {
      token = req.cookies.authToken;
    }

    if (!token) {
      return res.status(401).json({ message: "Not authorized, no token" });
    }

    // Ensure JWT_SECRET exists
    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET not set in environment");
      return res.status(500).json({ message: "Server misconfiguration" });
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (verifyErr) {
      console.error("JWT verification failed:", verifyErr);
      return res.status(401).json({ message: "Not authorized, token invalid" });
    }

    // Attach user to req (exclude password)
    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    req.user = user; // safe user object (no password)
    next();
  } catch (err) {
    console.error("Protect middleware error:", err);
    return res.status(500).json({ message: "Server error in auth" });
  }
};

// also export default for files that import default
export default protect;
