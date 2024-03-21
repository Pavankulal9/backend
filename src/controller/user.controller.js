import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError}  from "../utils/ApiError.js";
import {User} from "../models/user.model.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const generateAccessAndRefreshToken = async function(userId){
    try {
        const user = await User.findOne(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refershToken = refreshToken;
        //* this will stop password validation in the user model
        await user.save({validateBeforeSave: false});

        return {accessToken, refreshToken};

    } catch (error) {
        throw new ApiError(500,"Something went wrong while generating acess and refresh token")
    }
}

const registerUser=  asyncHandler(async function(req,res){
    const {fullName,username,email,password} = req.body;

    if(
        [fullName,email,password,username].some((field)=> field?.trim() === "")
    ){
        throw new ApiError(400,"All fields are required!");
    }

    const existUser = await User.findOne({
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
});

const loginUser = asyncHandler(async function(req,res){
    const {email,username,password} = req.body;

    if(!username && !email){
        throw new ApiError(400,"Username and email field required!");
    }

    const user = await User.findOne({
        $or:[{username},{email}]
    });

    if(!user){
        throw new ApiError(404,"User not exist!");
    }

    const isPasswordVaild = await user.isPasswordCorrect(password);

    if(!isPasswordVaild){
        throw new ApiError(400, 'Invaild password!');
    }

    const {accessToken,refreshToken} = await  generateAccessAndRefreshToken(user._id);

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    const option = {
        httpOnly: true,
        secure: true
    }
    res
    .status(200)
    .cookie("accessToken", accessToken, option)
    .cookie("refreshToken", refreshToken, option)
    .json(
        new ApiResponse(
            200,
           {
            user: loggedInUser, accessToken,
            refreshToken
           },
          "User logged In Successfully!"
        )
    )
});

const logOutUser = asyncHandler(async function(req,res){
   
   await User.findByIdAndUpdate(
    req.user._id,
    {
        $set:{
            refreshToken: undefined
        }
    },
    {
        new:true
    }
   );

   const options ={
    httpOnly: true,
    secure: true
   }

   return res
   .status(200)
   .clearCookie("accessToken",options)
   .clearCookie("refreshToken",options)
   .json(new ApiResponse(200,{},"User logged out"))

})

export {registerUser,loginUser,logOutUser};