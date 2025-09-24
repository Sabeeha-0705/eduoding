// server/scripts/promoteUser.js
// Usage examples (do NOT hardcode credentials here):
// mac/linux:
//   MONGO_URI="mongodb+srv://<user>:<pass>@cluster0.xqkw1w8.mongodb.net/mydatabase" \
//   node server/scripts/promoteUser.js user@example.com uploader
//
// PowerShell:
//   $env:MONGO_URI="mongodb+srv://<user>:<pass>@cluster0.xqkw1w8.mongodb.net/mydatabase"
//   node server/scripts/promoteUser.js user@example.com uploader

import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import User from "../models/authModel.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const showUsageAndExit = () => {
  console.error("\nUsage: MONGO_URI=\"<uri>\" node server/scripts/promoteUser.js user@example.com [role]\n");
  console.error("Examples:");
  console.error("  MONGO_URI=\"mongodb+srv://<user>:<pass>@cluster0.xqkw1w8.mongodb.net/mydatabase\" node server/scripts/promoteUser.js farjasfathima@gmail.com uploader");
  console.error("  $env:MONGO_URI=\"...\" (PowerShell) then run node server/scripts/promoteUser.js admin@example.com admin\n");
  process.exit(1);
};

if (!process.argv[2]) {
  console.error("❌ Missing email argument.");
  showUsageAndExit();
}

const email = process.argv[2].toLowerCase().trim();
const newRole = (process.argv[3] || "uploader").toLowerCase().trim();

if (!["user", "uploader", "admin"].includes(newRole)) {
  console.error(`❌ Invalid role "${newRole}". Allowed: user, uploader, admin`);
  process.exit(1);
}

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error("❌ MONGO_URI environment variable is required.");
  showUsageAndExit();
}

const run = async () => {
  try {
    console.log("🔗 Connecting to MongoDB...");
    await mongoose.connect(MONGO_URI, {
      dbName: process.env.MONGO_DB_NAME || undefined,
      // if using older drivers/options you can add them here
    });
    console.log("✅ Connected to MongoDB");

    const user = await User.findOne({ email });
    if (!user) {
      console.error(`❌ No user found with email: ${email}`);
      await mongoose.disconnect();
      process.exit(2);
    }

    console.log(`Found user: ${user.username || "(no username)"} <${user.email}>`);
    console.log(`Current role: ${user.role}`);

    if (user.role === newRole) {
      console.log(`ℹ️ User already has role "${newRole}". No changes made.`);
      await mongoose.disconnect();
      process.exit(0);
    }

    user.role = newRole;
    await user.save();

    console.log(`✅ Updated role for ${email}: "${user.role}"`);
    console.log("User id:", user._id.toString());

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("❌ Error:", err.message || err);
    try {
      await mongoose.disconnect();
    } catch (_) {}
    process.exit(3);
  }
};

run();
