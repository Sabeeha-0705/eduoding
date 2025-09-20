// server/middleware/roleMiddleware.js
export const requireUploader = (req, res, next) => {
  const role = req.user?.role || req.user?.provider === "google" ? "student" : req.user?.role;
  // If user model doesn't yet have role: instructs to add below.
  if (!role || (role !== "uploader" && role !== "admin")) {
    return res.status(403).json({ message: "Forbidden: uploader role required" });
  }
  next();
};

export default requireUploader;
