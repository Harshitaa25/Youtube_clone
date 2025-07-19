import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import jwt from "jsonwebtoken"
import { User } from "../models/user.models.js"

export const verifyJWT = asyncHandler(async(req,res,next)=>{
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer","").trim();
    
        if (!token) 
        {
            req.user = null;
            return next(); // let logout continue
        }

    
        const decodedToken=jwt.verify(token,process.env.ACCESS_TOKEN_SECRET)
    
        const user = await User.findById(decodedToken?._id).select("-password -refreshToken")
    
        if(!user)
        {
            throw new ApiError(401,"Inavlid Access Token")
        }
    
        req.user = user;
        next()
    } 
    catch (error) 
    {
        throw new ApiError(401,error?.message || "Invalid Access")
    }
})