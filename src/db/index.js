import mongoose from "mongoose";

const connectDB = async () => {
  const uri = process.env.MONGODB_URI;
  console.log("🔍 URI:", uri);

  if (!uri) {
    throw new Error("❌ MONGODB_URI is undefined! Ensure your .env file is set correctly.");
  }

  try {
    const conn = await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000
    });
    console.log(`🟢 MongoDB connected! Host: ${conn.connection.host}`);
  } catch (err) {
    console.error("🔴 MongoDB connection error:", err);
    process.exit(1);
  }
};

export default connectDB;
