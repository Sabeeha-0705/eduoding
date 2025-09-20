// server/scripts/fillRoles.js
import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../models/authModel.js";

dotenv.config();

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const res = await User.updateMany(
    { role: { $exists: false } },
    { $set: { role: "user" } }
  );
  console.log("Matched:", res.matchedCount, "Modified:", res.modifiedCount);
  await mongoose.disconnect();
  process.exit(0);
};

run().catch((e) => { console.error(e); process.exit(1); });
