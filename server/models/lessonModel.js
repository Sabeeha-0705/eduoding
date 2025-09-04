import mongoose from "mongoose";

const lessonSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },

    type: {
      type: String,
      enum: ["youtube", "upload"], // YouTube link OR uploaded file
      required: true,
    },

    videoUrl: { type: String, required: true }, // YouTube link OR upload path

    // Link lesson to a course (string IDs: "1","2","3",...)
    courseId: {
      type: String,
      required: true,
    },

    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

const Lesson = mongoose.model("Lesson", lessonSchema);
export default Lesson;
