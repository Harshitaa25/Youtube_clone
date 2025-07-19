import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config(); // ✅ load .env before use

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;

    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto"
    });

    fs.unlinkSync(localFilePath); // cleanup
    return response;
  } catch (error) {
    console.error("❌ Cloudinary Upload Error:", error);
    return null;
  }
};

export { uploadOnCloudinary };
