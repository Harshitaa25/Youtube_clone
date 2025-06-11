import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDB = async () => {
  const uri = process.env.MONGODB_URI; // <- this exists
  console.log("🔍 URI:", uri);

  if (!uri) {
    throw new Error("❌ MONGODB_URI is undefined! Ensure .env is correct.");
  }

  try {
    // ⚠️ Use `uri`, not `MONGODB_URI`
    const conn = await mongoose.connect(`${uri}/${DB_NAME}`, {
      serverSelectionTimeoutMS: 5000
    });
    console.log(`🟢 MongoDB connected! Host: ${conn.connection.host}`);
  } catch (err) {
    console.error("🔴 Connection error:", err);
    process.exit(1);
  }
};

export default connectDB;
