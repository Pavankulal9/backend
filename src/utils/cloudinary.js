import {v2 as cloudinary} from 'cloudinary';
import fs from 'fs';

cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET 
});

const uploadToCloudinary = async(localFilePath)=>{
    try {
        if(!localFilePath) return null;
       const response = await cloudinary.uploader.upload(localFilePath,{resource_type: 'auto'});
       console.log('File Successfully uploaded',response.url);
       return response;
    } catch (error) {
        fs.unlinkSync(localFilePath);
        // this will remove the localy saved temporary file as upload faild has been faild
        return null;
    }
}

export {uploadToCloudinary};