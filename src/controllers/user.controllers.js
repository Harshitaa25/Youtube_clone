import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"
import mongoose, {Schema} from "mongoose";

const generateAccessAndRefreshTokens = async(userId)=>
{
    try
    {
        const user=await User.findById(userId)
        const accessToken=user.generateAccessToken()
        const refreshToken=user.generateRefreshToken()

        user.refreshToken=refreshToken  // here we are saving refresh token in our db
        await user.save({validateBeforeSave : false})

        return {accessToken,refreshToken}

    }
    catch(error)
    {
        throw new ApiError(500,"Something went wrong while generating access and refresh tokens")
    }
}

const registerUser = asyncHandler(async (req, res) => {
    console.log("================ USER REGISTRATION START ================");

    //1.get user details from frontend
    //2.validation- not empty
    //3.check if user already exists: username, email
    //4.check for images, check for avatar
    //5.upload them to cloudinray
    //6.create user object- create entry in db
    //7.remove  password and refresh token field from response
    //8.check for user creation
    //9.return responseS

    // Log full request body and files
    console.log("📩 Body:", JSON.stringify(req.body, null, 2));
    console.log("📸 Files:", JSON.stringify(req.files, null, 2));

    const { fullName, email, username, password } = req.body;

    // Validation check
    if ([fullName, email, username, password].some(field => !field?.trim())) {
        console.log("❌ Validation failed: Some fields are empty");
        throw new ApiError(400, "All fields are required");
    }

    // Check for existing user
    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    });

    if (existedUser) {
        console.log("⚠️ User already exists with this email or username");
        throw new ApiError(409, "User with email or username already exists");
    }

    // Check if avatar is present
    if (!req.files || !req.files.avatar || req.files.avatar.length === 0) {
        console.log("❌ Avatar not received in uploaded files");
        throw new ApiError(400, "Avatar file is required");
    }

    // Extract file paths
    const avatarLocalPath = req.files.avatar[0]?.path;
    const coverImageLocalPath = req.files.coverImage?.[0]?.path;

    if (!avatarLocalPath) {
        console.log("❌ Avatar path not found in Multer file");
        throw new ApiError(400, "Avatar file is required");
    }

    // Upload to Cloudinary
    console.log("📤 Uploading avatar to Cloudinary:", avatarLocalPath);
    const avatar = await uploadOnCloudinary(avatarLocalPath);

    let coverImage = null;
    if (coverImageLocalPath) {
        console.log("📤 Uploading cover image to Cloudinary:", coverImageLocalPath);
        coverImage = await uploadOnCloudinary(coverImageLocalPath);
    }

    if (!avatar || !avatar.url) {
        console.log("❌ Avatar upload to Cloudinary failed");
        throw new ApiError(500, "Failed to upload avatar");
    }

    // Create user in DB
    const user = await User.create({
        fullName,
        email,
        username: username.toLowerCase(),
        password,
        avatar: avatar.url,
        coverImage: coverImage?.url || ""
    });

    // Remove sensitive fields
    const createdUser = await User.findById(user._id).select("-password -refreshToken");

    if (!createdUser) {
        console.log("❌ Failed to retrieve created user from DB");
        throw new ApiError(500, "Something went wrong while registering the user");
    }

    // Success log
    console.log("✅ User registered successfully:", createdUser.username);
    console.log("=========================================================");

    // Response
    return res.status(201).json(
        new ApiResponse(201, createdUser, "User registered successfully")
    );
});

const loginUser=asyncHandler(async(req,res)=>{
    //req body->data
    //username or email
    //find the user
    //password check
    //access and refresh token
    //send them by cookies

    const {email,username,password}=req.body

    if(!(username || email))
    {
        throw new ApiError(400,"username or password is required")
    }

    const user=await User.findOne({$or: [{username},{email}]   //ek toh username ya email se login hoga
    })

    if(!user)
    {
        throw new ApiError(404,"user does not exist")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)

    if(!isPasswordValid)
    {
        throw new ApiError(401,"Password incorrect")
    }

    const {accessToken,refreshToken}=await generateAccessAndRefreshTokens(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {     //here by this frontend cannot edit cookies it can only be editted by server
        httpOnly: true,
        secure:true
    }

    return res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
        new ApiResponse(
            200,
            {
            user: loggedInUser,accessToken,refreshToken
            },
            "User Logged In Successfully"
        )
    )
})

const logoutUser=asyncHandler(async(req,res)=>{
    if(req?.user._id)
    {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{refreshToken: undefined}
        },
        {
            new: true
        }
    )
}

    const options = {     //here by this frontend cannot edit cookies it can only be editted by server
        httpOnly: true,
        secure:true
    }

    return res
    .status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(new ApiResponse(200,{},"User Logged Out"))
    
})

const refreshAcessToken = asyncHandler(async(req,res)=>{
    const incomingRefreshToken= req.cookies.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken)
    {
        throw new ApiError(401,"Unauthorized request")
    }

    try {
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
    
        const user = await User.findById(decodedToken?._id) //decodedtoken se unwrap kro id
    
        if(!user)
        {
            throw new ApiError(401,"Invalid refresh token")
        }

          // ✅ ADD THESE TWO LINES FOR DEBUGGING:
        console.log("🔐 Incoming Token:", incomingRefreshToken);
        console.log("🗄️ Stored Token:", user?.refreshToken);

    
        //if(incomingRefreshToken !== user?.refreshToken) //user se unwrap kro refresh token
        //{
           // throw new ApiError(401,"Refresh token is expired or used")
       // }
    
        const options ={
            httpOnly: true,
            secure: true
        }
    
        const {accessToken, refreshToken:newRefreshToken} = await generateAccessAndRefreshTokens(user._id)
    
        return res
        .status(200)
        .cookie("accessToken",accessToken,options)
        .cookie("refreshToken",newRefreshToken,options)
        .json(
            new ApiResponse(
                200,
                {accessToken, refreshToken: newRefreshToken},
                "Acess Token refreshed "
            )
        )
    
    } 
    catch (error) 
    {
        throw new ApiError(401,error?.message || "Invalid refresh token")
        
    }

})

const changeCurrentPassword = asyncHandler(async(req,res)=>{
    const {oldPassword, newPassword} = req.body
    const user  = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if(!isPasswordCorrect)
    {
        throw new ApiError(400, "Inavlid old password")
    }

    user.password=newPassword
    await user.save({validateBeforeSave: false})

    return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"))
})

const getCurrentUser = asyncHandler(async(req,res)=>{
    return res
    .status(200)
    .json(new ApiResponse(200,req.user, "current user fetched successfully"))
})

const updateAccountDetails = asyncHandler(async(req,res)=>{
    const {fullName,email} = req.body

    if(!fullName || !email)
    {
        throw new ApiError(400,"All fields are required")
    }

    const user = await User.findByIdAndUpdate( 
        req.user?._id,
        {
            $set:{
                fullName:fullName,
                email:email
            }
        },
        {new : true} //update hone ke baad wali info will return

    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200, "Accounts details updated successfully"))


})

const updateUserAvatar = asyncHandler(async(req,res)=>{
    const avatarLocalPath = req.file?.path

    if(!avatarLocalPath)
    {
        throw new ApiError(400, " Avatar file is missing ")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if(!avatar.url)
    {
        throw new ApiError(400, " error while uploading on avatar")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar:avatar.url
            }
        },
        {new : true}
        
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200,user,"Cover Image uploaded successfully")) 

})

const updateUserCoverImage = asyncHandler(async(req,res)=>{
    const coverImageLocalPath = req.file?.path

    if(!coverImageLocalPath)
    {
        throw new ApiError(400, " Cover Image file is missing ")
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!coverImage.url)
    {
        throw new ApiError(400, " error while uploading on coverImage")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage:coverImage.url
            }
        },
        {new : true}
        
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200,user,"Cover Image uploaded successfully")) 

})

const getUserChannelProfile = asyncHandler(async(req,res)=>{
    const{username}= req.params   //url se hamne username nikala

    if(!username?.trim())
    {
        throw new ApiError(400,"Username is missing")
    }

    const channel = await User.aggregate([
        {
            $match:{
                username: username?.toLowerCase()
            }
        },
        {
            $lookup:{                       // to find subscribers
                from: "subscriptions",
                localField: "_id",
                foreignField: "channels",
                as: "subscribers"
            }
        },
        {
            $lookup:{                       //to find subscribed
                from: "subscriptions",
                localField:"_id",
                foreignField:"subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields:{
                subscribersCount:{
                    $size: "$subscribers"
                },
                channelsSubscribedToCount:{
                    $size:"$subscribedTo"
                },
                isSubscribed:{
                    if:{$in:[req.user._id, "$subscribers.subscriber"]},
                    then: true,
                    else: false
                }
            }
        },
        {
            $project:{         //here you pass 1 to data u wanna project
                fullName: 1,
                username: 1,
                subscribersCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1
            }
        }
    ])

    if(!channel?.length)
    {
        throw new ApiError(404,"channel does not exist")
    }

    return res
    .status(200)
    .json(new ApiResponse(200,channel[0],"User channel fetched successfully"))

})

const getWatchHistory = asyncHandler(async(req,res)=>{

    const user = await User.aggregate([
        {
            $match:{
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup:{
                from : "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline:[
                    {
                        $lookup:{
                            from:"users",
                            localField:"owner",
                            foreignField:"_id",
                            as: "owner",
                            pipeline:[
                                {
                                    $project:{
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields:{
                            owner:{
                                $first:"$owner"
                            }
                        }
                    }
                ]    
            }
        }
    ])

    return res
    .status(200)
    .json(
        new ApiResponse(200,user[0].watchHistory,"Watch History fetched")
    )
})

export { registerUser , loginUser , logoutUser , refreshAcessToken , getCurrentUser , changeCurrentPassword , updateAccountDetails , updateUserAvatar , updateUserCoverImage, getUserChannelProfile , getWatchHistory} 
