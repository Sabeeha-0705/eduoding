// server/models/videoModel.js
import mongoose from "mongoose";

const videoSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String },

    // uploader reference
    uploaderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    // source: upload file or youtube link
    sourceType: { type: String, enum: ["upload", "youtube"], required: true },
    youtubeUrl: { type: String },
    fileUrl: { type: String }, // /uploads/abc.mp4 or S3/Cloudinary URL
    thumbnailUrl: { type: String },

    // optional metadata
    duration: { type: Number }, // seconds
    width: { type: Number },
    height: { type: Number },

    // NEW: which course this video belongs to (string ids like "1","2" or later ObjectId)
    courseId: { type: String },

    // status enum: pending -> approved -> rejected
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" }
  },
  { timestamps: true }
);

const Video = mongoose.model("Video", videoSchema);
export default Video;
