// server/scripts/promoteUser.js
import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../models/authModel.js";

dotenv.config();

const run = async () => {
  if (!process.argv[2]) {
    console.error("Usage: node promoteUser.js user@example.com [role]");
    process.exit(1);
  }

  const email = process.argv[2];
  const role = process.argv[3] || "uploader"; // default uploader, can pass "admin"

  await mongoose.connect(process.env.MONGO_URI, {
    dbName: process.env.MONGO_DB_NAME || undefined,
  });

  const res = await User.updateOne({ email }, { $set: { role } });
  console.log(`✅ Updated ${email} → role: ${role}`);
  console.log("Result:", res);

  await mongoose.disconnect();
  process.exit(0);
};

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
