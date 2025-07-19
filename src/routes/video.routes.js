import express from "express"
import { getAllVideos, publishAVideo , getVideoById, updateVideo, deleteVideo } from "../controllers/videos.controllers.js"
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.route("/getAllVideos").get(getAllVideos);

router.route("/publish").post(verifyJWT,publishAVideo)

router.route("/:videoId").get(getVideoById)

router.route("/update/:videoId").put(verifyJWT,updateVideo)

router.route("/delete/:videoId").delete(verifyJWT,deleteVideo)
export default router;