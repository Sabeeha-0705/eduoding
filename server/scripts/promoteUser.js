// server/scripts/promoteUser.js
import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../models/authModel.js"; // adjust path if your model file name differs

dotenv.config();

const run = async () => {
  if (!process.argv[2]) {
    console.error("Usage: node promoteUser.js user@example.com");
    process.exit(1);
  }
  const email = process.argv[2];
  await mongoose.connect(process.env.MONGO_URI, { dbName: process.env.MONGO_DB_NAME || undefined });
  const res = await User.updateOne({ email }, { $set: { role: "uploader" } });
  console.log("Update result:", res);
  await mongoose.disconnect();
  process.exit(0);
};

run().catch((e) => { console.error(e); process.exit(1); });
