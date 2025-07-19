import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import userRouter from "./routes/user.routes.js";
import videoRouter from "./routes/video.routes.js"
import fileUpload from "express-fileupload";


const app = express();

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}));

app.use(fileUpload({
  useTempFiles: true,
  tempFileDir: "/tmp/"
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true })); // ✅ fixed typo
app.use(express.static("public"));
app.use(cookieParser());



// Routes import
//import userRouter from "./routes/user.routes.js";

// Route declaration
app.use("/api/v1/users", userRouter);

// http://localhost:8000/api/v1/users/register

app.use("/api/videos",videoRouter)
app.get("/",(req,res)=>{
    res.send("Api is working fine")
})

export { app };
