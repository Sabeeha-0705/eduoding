// server/middleware/roleMiddleware.js
export const requireUploader = (req, res, next) => {
  console.log("requireUploader: req.user =", !!req.user);
  if (!req.user) {
    console.log("requireUploader -> no req.user (401)");
    return res.status(401).json({ message: "Not authenticated" });
  }

  // show actual user object briefly for debugging
  console.log("User from protect:", {
    id: req.user._id,
    email: req.user.email,
    role: req.user.role,
    provider: req.user.provider
  });

  const role = req.user.role ?? (req.user.provider === "google" ? "student" : undefined);

  console.log("Computed role:", role);

  if (!role || (role !== "uploader" && role !== "admin")) {
    console.log("requireUploader -> Forbidden (role not uploader/admin)");
    return res.status(403).json({ message: "Forbidden: uploader role required" });
  }
  next();
};

export default requireUploader;
