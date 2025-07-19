import dotenv from "dotenv";
dotenv.config({
  path: './.env'
}); // ✅ Load .env first

import { app } from "./app.js"; // ✅ Import app
import connectDB from "./db/index.js";

connectDB().then(() => {
  app.listen(process.env.PORT || 8000, () => {
    console.log(`✅ Server running at port ${process.env.PORT}`);
  });
}).catch((err) => {
  console.error("❌ MongoDB connection failed!", err);
});
