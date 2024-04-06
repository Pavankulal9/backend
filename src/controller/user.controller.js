import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError}  from "../utils/ApiError.js";
import {User} from "../models/user.model.js";
import {deleteOldUploadedImage, uploadOnCloudinary} from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";


const generateAccessAndRefreshToken = async function(userId){
    try {
        const user = await User.findOne(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refershToken = refreshToken;
        //* this will stop password encryption in the user model
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

});

const refreshAcessToken = asyncHandler(async function(req,res){
    const incommingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if(!incommingRefreshToken){
        throw new ApiError(401, "Unauthorized request");
    }

   const decodedToken = jwt.verify(incommingRefreshToken, process.env.REFRESH_TOKEN_SECRET);

   const user = await User.findById(decodedToken?._id);

   if(!user){
    throw new ApiError(401,"Invalid refresh Token");
   }

  if(incommingRefreshToken !== user.refreshToken){
    throw new ApiError(401,"Refresh token is expired or used");
  }

  const options = {
    httpOnly: true,
    secure: true
  }

 const {accessToken,refreshToken} = await generateAccessAndRefreshToken(user._id);

 res
 .status(200)
 .cookie("accessToken", accessToken, options)
 .cookie("refreshToken", refreshToken, options)
 .json(
    new ApiResponse(
        200,
        {accessToken,refreshToken},
        "Access token refreshed")
 )
})

const changeCurrentPassword = asyncHandler(async function(){
   const {oldPassword,newPassword} = req.body;
   
   const user =await User.findById(req.user?._id);

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
     
    if(!isPasswordCorrect){
        throw new ApiError(400, "Invaild old password");
    }

    user.password = newPassword;
    await user.save({validateBeforeSave: true});
     
    return res
    .status(200)
    .json(
        new ApiResponse(200,{},"Change password successfully")
    );
});

const getCurrentUser = asyncHandler(async function(req,res){
    return res
    .status(200)
    .json(
        new ApiResponse(200,req.user,"Current user fetched successfully")
    )
});

const updateAccountDetails = asyncHandler(async function(req,res){
     const {fullName,email} = req.body;
     
     if(!fullName || !email){
        throw new ApiError(401, "All fields required");
     }

     if(email !== req.user.email){
        const isEmailPresent = User.findOne({
            $or:[{email}]
        })

        if(isEmailPresent){
            throw new ApiError(400,"Email already exist");
        }
     }

     const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                fullName,
                email
            }
        },
        {
             new:true
        }
     ).select("-password");

     return res
     .status(200)
     .json(
        new ApiResponse(200,user,"Account details updated successfully")
     );
});

const updateUserAvatar = asyncHandler(async function(req,res){
     const avatarLocalPath = req.file?.path;

     if(!avatarLocalPath){
        throw new ApiError(400,"Avatar file is missing");
     }

     const avatar = await uploadOnCloudinary(avatarLocalPath);

     await deleteOldUploadedImage(req.user?.avatar);

     if(!avatar){
        throw new ApiError(400,"Error while uploading avatar")
     }

     const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                avatar: avatar.url
            }
        },
        {
            new: true
        }
     ).select("-password -refreshToken");

     return res
     .status(200)
     .json(
        new ApiResponse(200,user,"Updated avatar successfully")
     );
});

const updateUserCoverImage = asyncHandler(async function(req,res,){
    const coverImageLocalPath = req.file?.path;

    if(!coverImageLocalPath){
       throw new ApiError(400,"Cover imgae file is missing");
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if(req.user?.coverImage){
        await deleteOldUploadedImage(req.user.coverImage);
    }

    if(!coverImage.url){
       throw new ApiError(400,"Error while uploading cover image")
    }

    const user = await User.findByIdAndUpdate(
       req.user._id,
       {
           $set:{
               coverImage: coverImage.url
           }
       },
       {
           new: true
       }
    ).select("-password -refreshToken");

    return res
    .status(200)
    .json(
       new ApiResponse(200,user,"Updated cover image successfully")
    );
});

const getUserChannelProfile = asyncHandler(async function(req,res){
   const {username} = req.params;
    
   if(!username?.trim()){
    throw new ApiError(400,"Username is missing");
   }

   const channel = await User.aggregate([
    {
      $match: {
        username: username?.toLowerCase()
      },
    },
    {
        $lookup:{
            from: "subscriptions",
            localField:"_id",
            foreignField:"channel",
            as:"subscribers"
        }
    },
    {
        $lookup:{
            from: "subscriptions",
            localField:"_id",
            foreignField:"subscriber",
            as:"subscribedTo"
        }
    },
    {
        $addFields:{
            subscribersCount:{
                $size: "$subscribers"
            },
            channleSubcribedToCount:{
                $size: "$subscribedTo"
            },
            isSubscribed:{
                $cond:{
                    $if: {$in:[req.user?._id, "$subscribers.subscriber"]},
                    then:true,
                    else:false
                }
            }
        }
    },
    {
        $project:{
            fullName: 1,
            username:1,
            avatar:1,
            coverImage:1,
            subscribersCount:1,
            channleSubcribedToCount:1,
            isSubscribed:1
        }
    }
   ]);

   if(!channel?.length){
    throw new ApiError(404,"Channel does not exist")
   }

   return res
   .status(200)
   .json(
    new ApiResponse(200,channel[0],"User channel fetched successfully")
   );

});

const getUserWatchHistory = asyncHandler(async function(req,res){
   const user = await User.aggregate([
    {
        $match:{
            _id: mongoose.Types.ObjectId(req.user?._id)
        }
    },
    {
        $lookup:{
            from:"videos",
            localField:"watchHistory",
            foreignField:"_id",
            as: "watchHistory",
            pipeline:[
                {
                    $lookup:{
                        from: "users",
                        localField:"owner",
                        foreignField:"_id",
                        as:"owner",
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
                    /*because the pipeline return array we are changing 
                    it and returning the first elemet object to frontend*/
                    $addFields:{
                        owner:{
                            $first: "$owner"
                        }
                    }
                }
            ]
        }
    }
   ]);

   return res
   .status(200)
   .json(
    new ApiResponse(
        200,user[0].watchHistory,"watch history fetched successfully"
    ));

})

export {registerUser,
        loginUser,
        logOutUser,
        refreshAcessToken,
        changeCurrentPassword,
        getCurrentUser,
        updateAccountDetails,
        updateUserAvatar,
        updateUserCoverImage,
        getUserChannelProfile,
        getUserWatchHistory
    };