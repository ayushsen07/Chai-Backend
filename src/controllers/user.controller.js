import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import { User } from "../models/user.model.js";
import {uploadOnCloudinary} from "../utils/cloudnary.js"
import ApiResponse from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"
const generateAccessAndRefreshToken = async(userId)=>{
    // this function is for generate access or rrefresh token when we call it
    try {
        const user= await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken=refreshToken
        await user.save({validateBeforeSave : false}) 
        
        return {accessToken , refreshToken}

    } catch ( err) {
        throw new ApiError(500 , "something went wrong while generating refresh and access Token")
        
    }
}

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
   
    // console.log("req text" , req.body)
    // console.log("req files" , req.files)
      
   const {fullName,email,username,password} =req.body
   
   if ([fullName , email,username,password].some((field)=>field?.trim()=="")
   ) {
    
    
      throw new ApiError(404," All feilds are required")
   }


   // checking user already present or not
const existedUser = await User.findOne({
    $or:[{username},{email}]
})
if (existedUser) {
    throw new ApiError(409,"user with email or username is already exixt")  
}


// here file is handle by multer and multer save it the our local path place and than according to  localPath we upload file on cloudinary and it give url of file. 
// console.log(req.files);

const avatarLocalPath = req.files?.avatar[0]?.path;
const coverImageLocalPath= req.files?.coverImage[0]?.path  || "";
  
// let coverImageLocalPath;
// if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0 ) {
//   coverImageLocalPath = req.files.coverImage[0].path
// }
//console.log(avatarLocalPath);
  


  if (!avatarLocalPath) {
    throw new ApiError(400,"Avatar file is required ayush")
}


// here we give local path of avatar to the avatar localpath and cloudianry upload it to itself
const avatar =await uploadOnCloudinary(avatarLocalPath)
 const coverImage = await uploadOnCloudinary(coverImageLocalPath)

 if (!avatar) {
    throw new ApiError(400,"avatar file is required")
 }

const user = await User.create({
    fullName,
    avatar:avatar.url,
    coverImage :  coverImage?.url || "",
    email,
    password,
    username : username.toLowerCase()

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

  
// ******LOGIN******

const loginUser = asyncHandler(async(req , res)=>{
   
    /**
    *  need get username or email with password by user
    * check by email if user is present or not 
    * if present than match user provide details are matched or not like password or email
    * if matched than logedIn user- generate accesss or refrsh  token
    * send cookie
    * response - login successfully
    */ 

    const {email, username , password} = req.body

      // console.log("email" , req.body.email);
       


    if (!username && !email) {
        throw new ApiError(400, "username or email is required")   
    }
    const user = await User.findOne({
        $or: [{username} , {email}]
    })

    if(!user){
        throw new ApiError(404,"user does not exist")
    }
   // console.log("user details",user);
    


    const isPasswordValid = await user.isPasswordCorrect(password)
      
    if(!isPasswordValid){
        throw new ApiError(401, "Invalid password")
    }
     
    // have access or refresh token
   const {accessToken , refreshToken} = await generateAccessAndRefreshToken(user._id)

 //not send pass, token to the user
  const loggedInUser = await User.findById(user._id).select("-password -refreshToken")
   
    //send tokens in cookie
   const option =  { 
     httpOnly : true,
     secure : true
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, option)
    .cookie("refreshToken", refreshToken,option)
    .json(
        new ApiResponse(
            200,
            {
                user : loggedInUser, accessToken , refreshToken
            },
            "user logged in successfully"
        )
    )
    
})

const logoutUser = asyncHandler(async(req, res)=>{
   await User.findByIdAndUpdate(req.user._id,
       {
          $set :{
            refreshToken : undefined
          }
        },
        {
            new : true
        }
    )

    const option =  { 
        httpOnly : true,
        secure : true
       }
       return res
       .status(200)
       .clearCookie("accessToken" , option)
       .clearCookie("refreshToken" , option)
       .json(new ApiResponse(200, {}, "user logged out"))
})

const refreshAccessToken = asyncHandler(async(req ,res)=>{
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken){
        throw new ApiError(401, "unauthorized request")
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
    
        const user =await User.findById(decodedToken?._id)
    
        if (!user) {
            throw new ApiError(401,"Invalid refresh token")
            
        }
    
        if (incomingRefreshToken !==user?.refreshToken) {
            throw new ApiError(401,"Refresh token is expired or used")
            
        }
    
        const option={
            httpOnly : true,
            secure : true
        }
    
        const {accessToken , newRefreshToken} = await generateAccessAndRefreshToken(user._id)
     
        return res.status(200)
        .cookie("accessToken",accessToken,option)
        .cookie("refreshToken",newRefreshToken,option)
        .json(
            new ApiResponse(
                200,
                {accessToken, refreshToken :newRefreshToken},
                "Access token refreshed"
            )
        )
    } catch (err) {
        throw new ApiError(401,error?.message || "invalid refresh token ")
    }
})

const changeCurrentPassword  = asyncHandler(async(req, res)=>{
   const {oldPassword, newPassword}= req.body

   const user = await  User.findById(req.user?._id)
   const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

   if (!isPasswordCorrect) {
    throw new ApiError(400,"invalid old password")
    
   }
   user.password=newPassword
   await user.save({validateBeforeSave : false})
   
   return res.status(200).json(new ApiResponse(200,{}, "password cahnge successfully"))
})

const getCurrentUser = asyncHandler(async(req,res)=>{
    return res.status(200)
    .json(new ApiResponse(200,req.user,"current fatches succesfully"))
})

const updateAccountDetails =  asyncHandler(async(req,res)=>{
    const {fullName , email} = req.body
    if (!fullName || !email) {
        throw new ApiError(400,"All fields are requied")
        
    }
    const user =await User.findByIdAndUpdate(req.user?._id,
        {
          $set:{
            fullName : fullName,
            email:email
          }
          
        },
        {
            new : true
        }
    ).select("-password")
    return res.status(200)
    .json(new ApiResponse(200,user ," Account details updated successfully"))
})

const updateUserAvatar = asyncHandler(async (req,res)=>{
  const avatarLocalpath  = req.file?.path

  if(!avatarLocalpath){
    throw new ApiError(400, " Avatar file is missing")
  }
  const avatar = await uploadOnCloudinary(avatarLocalpath)
 
  if (!avatar.url) {
    throw new ApiError(400, "error while uploading on avatar")
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
       $set :{
        avatar : avatar.url
       }
    },
    {new : true}
  ).select("-password")

  return res.status(200)
    .json(new ApiResponse(200,user,"Avatar Image update successfully"))

})

const updateUserCoverImage = asyncHandler(async (req,res)=>{
    const coverImageLocalpath  = req.file?.path
  
    if(!coverImageLocalpath){
      throw new ApiError(400, " coveeImage file is missing")
    }
    const coverImage = await uploadOnCloudinary(coverImageLocalpath)
   
    if (!coverImage.url) {
      throw new ApiError(400, "error while uploading on coverimage")
    }
  
    const user = await User.findByIdAndUpdate(
      req.user?._id,
      {
         $set :{
          coverImage : coverImage.url
         }
      },
      {new : true}
    ).select("-password")
     
    return res.status(200)
    .json(new ApiResponse(200,user,"coverimage update successfully"))

  })

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage
} 