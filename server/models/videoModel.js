// server/models/videoModel.js
import mongoose from "mongoose";

const videoSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    uploaderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    sourceType: { type: String, enum: ["upload", "youtube"], required: true },
    youtubeUrl: { type: String },
    fileUrl: { type: String }, // /uploads/abc.mp4 or S3/Cloudinary URL
    thumbnailUrl: { type: String },
    duration: { type: Number }, // seconds
    width: { type: Number },
    height: { type: Number },
    status: { type: String, enum: ["pending", "published", "rejected"], default: "pending" }
  },
  { timestamps: true }
);

const Video = mongoose.model("Video", videoSchema);
export default Video;
