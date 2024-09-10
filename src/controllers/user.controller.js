import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import { User } from "../models/user.model.js";
import {uploadOnCloudinary} from "../utils/cloudnary.js"
import ApiResponse from "../utils/ApiResponse.js";

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
//const coverImageLocalPath= req.files?.coverImage[0]?.path  || "";
  
let coverImageLocalPath;
if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0 ) {
  coverImageLocalPath = req.files.coverImage[0].path
}
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

    if (!username && !email) {
        throw new ApiError(400, "username or email is required")   
    }
    const user = await User.findOne({
        $or: [{username} , {email}]
    })

    if(!user){
        throw new ApiError(404,"user does not exist")
    }


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


export {
    registerUser,
    loginUser,
    logoutUser
} 