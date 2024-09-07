import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import { User } from "../models/user.model.js";
import {uploadOnCloudinary} from "../utils/cloudnary.js"
import ApiResponse from "../utils/ApiResponse.js";

const registerUser = asyncHandler( async(req,res) =>{
   //   get or read the request come from user or frontend 
   //   check all  perams of request are right and valid-not empty
   //   check if user already exits: username, email
   //   check for images, check for avatar
   //   upload them to cloudinary,avatar
   //   create a object user - create entry in db
   //   remove password and refresh token field from response
   //   check for user creation
   //   return res  

   const {fullName,email,username,password} =req.body
   console.log("email" , email);
   
   if (
    [fullName , email,username,password].some((field)=>field?.trim()=="")
   ) {
      throw new ApiError(404," All feilds are required")
   }


   // checking user already present or not
const existedUser = User.findOne({
    $or:[{username},{email}]
})
if (existedUser) {
    throw new ApiError(409,"user with email or username is already exixt")  
}


// here file is handle by multer and multer save it the our local path place and than according to  localPath we upload file on cloudinary and it give url of file. 
const avatarLocalath = req.files?.avatar[0]?.path;
const coverImageLocalPath= req.files?.coverImage[0]?.path;

if (!avatarLocalath) {
    throw new ApiError(400,"Avatar file is required")
}


// here we give local path of avatar to the avatar localpath and cloudianry upload it to itself
const avatar =await uploadOnCloudinary(avatarLocalath)
 const coveImage = await uploadOnCloudinary(coverImageLocalPath)

 if (!avatar) {
    throw new ApiError(400,"avatar file is required")
 }

const user = await User.create({
    fullName,
    avatar:avatar.url,
    coverImage :  coverImage?.url ||"",
    email,
    password,
    username : username.toLowercase

})

const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
)

if (!createdUser) {
    throw new ApiError(500,"Something went wrong while registering the user")    
}

// after registering user send the details of user 
return res.status(201).json(
    new ApiResponse(200, createdUser , "User registered successfully")
)


})

  
export default registerUser