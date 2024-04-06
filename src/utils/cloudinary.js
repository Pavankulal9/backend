import {v2 as cloudinary} from 'cloudinary';
import fs from 'fs';

cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET 
});

const uploadOnCloudinary = async(localFilePath)=>{
    try {
        if(!localFilePath) return null;
        const response = await cloudinary.uploader.upload(localFilePath,{resource_type:'auto',folder:"chai_backend"});
        fs.unlinkSync(localFilePath);
        return response;
    } catch (error) {
        fs.unlinkSync(localFilePath);
        console.log(error);
        // this will remove the localy saved temporary file as upload faild has been faild
        return null;
    }
}

const deleteOldUploadedImage = async(oldFilePAth)=>{
    try {
        if(!oldFilePAth) return null;
        const response = await cloudinary.uploader.destroy(oldFilePAth);
        return response;
    } catch (error) {
        console.log(error.message);
        return null;
    }
}

export {uploadOnCloudinary,deleteOldUploadedImage};