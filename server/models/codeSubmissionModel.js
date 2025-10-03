// server/models/codeSubmissionModel.js
import mongoose from "mongoose";

const codeSubmissionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    courseId: { type: String, required: false }, // optional link to course
    lessonId: { type: String, required: false }, // optional
    title: { type: String, default: "Solution" },

    source: { type: String },
    languageId: { type: Number }, // judge0 language id (if known)
    languageName: { type: String }, // friendly name used by frontend
    stdin: { type: String, default: "" },

    // judge0 result
    status: { type: String, enum: ["queued","running","done","error"], default: "queued" },
    rawResult: { type: Object }, // full response from judge0
    stdout: { type: String },
    stderr: { type: String },
    compileOutput: { type: String },
    time: { type: String },
    memory: { type: String },

    passed: { type: Boolean, default: false }, // if you run tests & determine pass
    score: { type: Number, default: 0 }, // optional score from auto-tests

  },
  { timestamps: true }
);

const CodeSubmission = mongoose.model("CodeSubmission", codeSubmissionSchema);
export default CodeSubmission;
