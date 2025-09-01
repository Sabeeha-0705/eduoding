import mongoose from "mongoose";

const lessonSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },

    type: { 
      type: String, 
      enum: ["youtube", "upload"], 
      required: true 
    }, // youtube / upload

    videoUrl: { type: String, required: true }, // YouTube link OR uploaded file path

    // 👇 New field to link lesson to a course
    courseId: { 
      type: Number,   // same as your Dashboard course IDs (1,2,3…)
      required: true 
    },

    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  },
  { timestamps: true }
);

const Lesson = mongoose.model("Lesson", lessonSchema);
export default Lesson;
