import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError}  from "../utils/ApiError.js";
import {User} from "../models/user.model.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const registerUser=  asyncHandler(async function(req,res){
    const {fullName,username,email,password} = req.body;

    if(
        [fullName,email,password,username].some((field)=> field?.trim() === "")
    ){
        throw new ApiError(400,"All fields are required!");
    }

    const existUser = User.findOne({
        $or:[{username},{email}]
    });

    if(existUser){
        throw new ApiError(409,"User with email and username already exist!");
    }

    const avatarLocalPath = req.files?.avatar[0].path;
    const coverImageLocalPath = req.files?.coverImage[0].path;

    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar field  is required!")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);
   
    if(!avatar){
        throw new ApiError(400, "Avatar field  is required!")
    }

    const user = await User.create({
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        fullName,
        username,
        email,
        password
    });

    const createdUser = await User.findById(user._id).select("-password -refreshToken");

    if(!createdUser){
       throw new ApiError(500,'Somthing went wrong while registering, please try again');
    }
    res.status(201).json(
        new ApiResponse(200,createdUser,"User registered successfully!")
    );
})

export {registerUser};