// server/models/noteModel.js
import mongoose from "mongoose";

const noteSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    courseId: {
      type: String, // or ObjectId if you later add courses collection
      required: false,
    },
    lessonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Video",
      required: false,
    },
    content: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const Note = mongoose.model("Note", noteSchema);
export default Note;
