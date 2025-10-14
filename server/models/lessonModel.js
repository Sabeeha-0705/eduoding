import mongoose from "mongoose";

const lessonSchema = new mongoose.Schema(
  {
    // Lesson title
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
    },

    // Short description about lesson
    description: {
      type: String,
      trim: true,
    },

    // Type of lesson: youtube / upload / text / etc.
    type: {
      type: String,
      required: [true, "Type is required"],
      enum: ["youtube", "upload", "text"],
      default: "youtube",
    },
  },
  { timestamps: true }
);

const Lesson = mongoose.model("Lesson", lessonSchema);
export default Lesson;
