// scripts/setCourseIdForVideo.js
import mongoose from "mongoose";
import Video from "../server/models/videoModel.js";
import { mongoUri } from "../server/config/db.js"; // or use process.env.MONGO_URI

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  // set by id:
  await Video.updateOne({ _id: "68db9506033784b168552998" }, { $set: { courseId: "1" }});
  console.log("done");
  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
