// server/models/lessonModel.js
import mongoose from "mongoose";

const lessonSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: [200, "Title too long (max 200 chars)"],
    },

    type: {
      type: String,
      enum: {
        values: ["youtube", "upload"],
        message: "Type must be either 'youtube' or 'upload'",
      },
      required: [true, "Type is required"],
      default: "youtube",
    },

    // YouTube link OR local/cloud uploaded file URL
    videoUrl: {
      type: String,
      required: [true, "videoUrl is required"],
      trim: true,
      maxlength: [2000, "videoUrl too long"],
    },

    // Link lesson to a course (string IDs: "1","2","3", etc.)
    courseId: {
      type: String,
      required: [true, "courseId is required"],
      trim: true,
      index: true,
    },

    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // optional metadata
    duration: {
      type: Number, // seconds
      min: [0, "Duration can't be negative"],
    },

    description: {
      type: String,
      trim: true,
      maxlength: [2000, "Description too long"],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// friendly id and hide __v
lessonSchema.method("toJSON", function () {
  const obj = this.toObject({ virtuals: true });
  obj.id = obj._id;
  delete obj._id;
  delete obj.__v;
  return obj;
});

// compound index suggestion (optional) - uncomment if you query by course + title often
// lessonSchema.index({ courseId: 1, title: 1 });

const Lesson = mongoose.model("Lesson", lessonSchema);
export default Lesson;
