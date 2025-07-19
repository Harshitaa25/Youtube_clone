import mongoose, {isValidObjectId} from "mongoose";
import {Video} from "../models/video.model.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import { ApiError } from "../utils/ApiError.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

 const getAllVideos = asyncHandler(async(req, res)=>{
    const {
        page = 1, 
        limit = 10, 
        query="", 
        sortBy="createdBy" , 
        sortType ="desc",
        userId 
    } = req.query

    const filter={}

    if(query)
    {
        filter.title = {$regex :query, $options: "i"}
    }

    if(userId)
    {
        filter.owner=userId
    }

    const totalVideos  = await Video.countDocuments(filter)

    //Pagination
    const pageNumber =parseInt(page);
    const limitNumber = parseInt(limit);
    const skip = (pageNumber - 1)* limitNumber;

    //sortOptions
    const sortOption = {};
    sortOption[sortBy]=sortType==="asc"? 1 : -1;

    //get Videos

    const videos = await Video.find(filter)
    .sort(sortOption)
    .skip(skip)
    .limit(limitNumber)

    //send response
    return res.status(200)
            .json(new ApiResponse(200,{totalVideos,
                currentPage: pageNumber,
                totalPages:Math.ceil(totalVideos/limitNumber),
                videos
            },
        "Videos fetched successfully")
    )

})

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description} = req.body
    // TODO: get video, upload to cloudinary, create video

    //validate input
    if(!title || !description)
    {
        throw new ApiError(400,"Title and description are ready")
    }

    //check if file is present
    const videoFile = req.files?.videoFile;

    if(!videoFile)
    {
        throw new ApiError(400,"video file is required")
    }

    //upload it to cloudinary
    const uploadVideo = await uploadOnCloudinary(videoFile.tempFilePath)
    if(!uploadVideo)
    {
        throw new ApiError(500,"Video upload fail");
    }

    // 🌟 Extract duration & thumbnail
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const publicId = uploadVideo.public_id;
  const thumbnailUrl = `https://res.cloudinary.com/${cloudName}/video/upload/so_1/${publicId}.jpg`;


    //create video entry in db
    const newVideo = await Video.create({
        title,
        description,
        videoUrl : uploadVideo.url,
        thumbnail: thumbnailUrl,
        duration : uploadVideo.duration,
        videoFile:videoFile.name,
        //owner:req.user._id
    })

    //return response
    return res
    .status(201)
    .json(new ApiResponse(201, newVideo, "Video published successfully")
)


})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: get video by id

    if(!mongoose.Types.ObjectId.isValid(videoId))
    {
        throw new ApiError(400,"Inavlid video ID")
    }

    const video = await Video.findById(videoId).lean()

    if(!video)
    {
        throw new ApiError(404,"Video not found")
    }

    return res
    .status(200)
    .json(new ApiResponse(200,video,"Video fetched succesfully"))
})

const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  // Validate the video ID
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }

  // Find the video
  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  // Get updated fields from the request body
  const { title, description } = req.body;

  // If a thumbnail is being updated
  let thumbnailUrl = video.thumbnail;
  if (req.files?.thumbnail) {
    const uploadedThumbnail = await uploadOnCloudinary(req.files.thumbnail.tempFilePath);
    if (!uploadedThumbnail || !uploadedThumbnail.url) {
      throw new ApiError(500, "Thumbnail upload failed");
    }
    thumbnailUrl = uploadedThumbnail.url;
  }

  // Update only the fields that are provided
  if (title) video.title = title;
  if (description) video.description = description;
  video.thumbnail = thumbnailUrl;

  // Save the updated video
  await video.save();

  // Send response
  return res.status(200).json(
    new ApiResponse(200, video.toObject(), "Video updated successfully")
  );
});

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: delete video

    if(!isValidObjectId(videoId))
    {
        throw new ApiError(400,"Invalid video Id")
    }

    const video= await Video.findById(videoId)
    if(!video)
    {
        throw new ApiError(404.,"Video not found")
    }

    await Video.deleteOne({_id:videoId})

    return res
    .status(200)
    .json(new ApiResponse(200,{},"Video deleted successfully"));
})


export {getAllVideos, publishAVideo ,getVideoById,  updateVideo , deleteVideo}

