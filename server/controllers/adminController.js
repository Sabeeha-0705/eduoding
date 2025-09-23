import User from "../models/authModel.js";

export const getUploaderRequests = async (req, res) => {
  try {
    // find users who requested uploader but still role=user
    const requests = await User.find({ requestedUploader: true, role: "user" }).select("username email createdAt");
    res.json(requests);
  } catch (err) {
    console.error("getUploaderRequests:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const approveUploader = async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findByIdAndUpdate(userId, { role: "uploader", requestedUploader: false }, { new: true });
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ message: "Approved", user });
  } catch (err) {
    console.error("approveUploader:", err);
    res.status(500).json({ message: "Server error" });
  }
};
