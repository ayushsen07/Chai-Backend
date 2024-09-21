import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.model.js"
import { User } from "../models/user.model.js"
import ApiResponse from "../utils/ApiResponse.js"
import { ApiError } from "../utils/ApiError.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { deleteOnCloudinary, uploadOnCloudinary } from "../utils/cloudnary.js"
import { Comment } from "../models/comment.model.js"
import { Like } from "../models/likes.model.js"





const getAllVideos = asyncHandler(async(req,res)=>{
    const {page = 1,limit=10, query , sortBy, sortType,userId} = req.query

    // Build search filter
    const filteredVideo = [];
    console.log(userId);

    // if query present than search based on text
    try{
    if(query){
      filteredVideo.push(
        {
          $search :{
            index : "search-videos",
            text :{
              query: query,
              path  :["title" , "descriptoin"] // search on the title and description
            }
          }
        }
      )
    }

    if(userId){
      if(!isValidObjectId(userId)){
        throw new ApiError(400,"Invalid userId")
      }
      filteredVideo.push(
        {
          $match :{
            owner: new mongoose.Types.ObjectId.createFromHexString(userId)
          }
        }
      )
    }

    filteredVideo.push({$match :{isPublished : true } });

    //sort ny views and creation at 

    if(sortBy && sortType){
      filteredVideo.push(
        {
          $sort :{
            [sortBy] : sortType === "asc" ? 1: -1
          }
        }
      )
    }else{
      filteredVideo.push(
        {
          $sort :{
            createdAt :-1
          }
        }
      )
    }
    filteredVideo.push(
            {
                $lookup: {
                    from: "users",
                    localField: "owner",
                    foreignField: "_id",
                    as: "ownerDetails",
                    pipeline: [
                        {
                            $project: {
                                username: 1,
                                "avatar.url": 1,
                            },
                        },
                    ],
                },
            },
            { $unwind: "$ownerDetails" } // Unwind the user details
        );

        // Apply aggregation with pagination
        const videoAggregate = Video.aggregate(filteredVideo);
        const options = {
            page: parseInt(page, 10) || 1, // Default to page 1 if not provided
            limit: parseInt(limit, 10) || 10, // Default to 10 if not provided
        };
        const videos = await Video.aggregatePaginate(videoAggregate, options);

        return res.status(200).json(new ApiResponse(200, videos, "Videos fetched successfully"));
    }
    catch (error) {
        return res.status(500).json(new ApiError(500, "An error occurred", error));
    }

})

// for publish a video

const publishVideo = asyncHandler(async(req , res)=>{
  const {title , description} = req.body
  
  if([title , description].some((field)=>field?.trim()=="")){
    throw new ApiError(400, "title is required")
  }

  const videoLocalPath = req.files?.videoFile[0]?.path
  const thumbnailLocalPath = req.files?.thumbnail[0]?.path

  if(!videoLocalPath && !thumbnailLocalPath){
 
    throw new ApiError(400, " videofile and thumbnail is required")
  }
  
  const videoFile = await uploadOnCloudinary(videoLocalPath)
  const thumbnail = await uploadOnCloudinary(thumbnailLocalPath)


  if(!videoFile && !thumbnail){
 
    throw new ApiError(400, " videofile and thumbnail is required")
  }

  const video= await Video.create(
   { title,
    description,
    videoFile : videoFile.url,
    thumbnail : thumbnail.url,
    duration : videoFile.duration,
    owner : req.user?._id,
    isPublished : false

  }
  )

  const videoUploded= await Video.findById(video._id)

  if (!videoUploded) {
    throw new ApiError(400 , "Video uplod is failed try agian !!!")
    
  }
  return res
  .status(200)
  .json(new ApiResponse(200 , videoUploded, "video uploded successfully"))

})

const getVideoById = asyncHandler(async(req , res)=>{

  const {videoId} = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400 ,"Invalid video ID")
    
  }
  if (!isValidObjectId(req.user?._id)) {
    throw new ApiError(400 ,"Invalid user ID")
  }

  const video = await Video.aggregate([

    {
      $match :{
        _id : mongoose.Types.ObjectId(videoId)
      }
    },
    {
      $lookup :{
        from : "likes",
        localField:"_id",
        foreignField :"video",
        as:"likes"
      }
    },
    {
      $lookup :{
        from : "users",
        localField :"owner",
        foreignField :"_id",
        as :"owner",

        pipeline : [
          {
            $lookup:{
              from: "subscriptions",
              localField: "_id",
              foreignField: "channel",
              as: "subscribers"
            }
          },
          {
            $addFields: {
              subscribersCount: {
                  $size: "$subscribers"
              },
              isSubscribed: {
                  $cond: {
                      if: {
                          $in: [
                              req.user?._id,
                              "$subscribers.subscriber"
                          ]
                      },
                      then: true,
                      else: false
                  }
              }
            }
          },
          {
            $project:{
              uesrname : 1,
              "avatar.url" : 1,
              subscribersCount :1,
              isSubscribed : 1
            }
          }
        ]
      }
    },
    {
      $addFields :{
        likesCount :{
          $size: "$likes"
        },
        owner :{
          $first : "$owner"
        },
        isLiked :{
          $cond :{
            if :{$in : [req.user?._id, $likes.likedBy]},
            then : true,
            else : false
          }
          
        }
      }
    },
    {
      $project: {
        "videoFile.url": 1,
        title: 1,
        description: 1,
        views: 1,
        createdAt: 1,
        duration: 1,
        comments: 1,
        owner: 1,
        likesCount: 1,
        isLiked: 1
    }
    }
  ]);

  if(!video){
    throw new ApiError(500,"failed to fetch video")
  }

  //increment veiws if video fetched succesfully
  await Video.findByIdAndUpdate(videoId , {
    $inc:{
      views:1
    }
  });

  //add this video to user watch hstory
  await User.findByIdAndUpdate(req.user?._id,{
    $addToSet :{
      watchHistory : videoId
    }
  })

  return res
  .status(200)
  .json(new ApiResponse(200, video[0] , "video details fetched successfully"))

})

// update video

const updateVideo = asyncHandler(async(req, res)=>{
  const {title , description} = req.body
  const {videoId} = req.params

  if (!isValidObjectId(videoId)) {
       throw new ApiError(400, " Inavalid videoId")
  }

  if(!(title && description)){
    throw new ApiError(400, " title and description are required")
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(400, "No video found")
  }
if (video?.owner.toString()!== req.user?._id.toString()) {
  throw new ApiError(400, " Only owner of video is update the details of video")
  
}

const thumbnailToDelete = video.thumbnail.public_id


const thumbnailLocalPath = req.files?.path;
if(!thumbnailLocalPath){
  throw new ApiError(400 , "thumbnailis required")
}
const thumbnail = await uploadOnCloudinary(thumbnailLocalPath)

if(!thumbnail){
  throw new ApiError(400 , "thumbnailis not found")
}
const updatedVideo = await Video.findByIdAndUpdate(videoId , {
  $set :{
    title,
    description,
    thumbnail :{
      public_id : thumbnail.public_id,
      url : thumbnail.url
    }
  }
},
{new : true}
);

if (!updatedVideo) {
  throw new ApiError(500, "Failed to update video please try again");
}

if (updatedVideo) {
  await deleteOnCloudinary(thumbnailToDelete);
}

return res
.status(200)
.json(new ApiResponse(200,updatedVideo,"video updated successfully"))

})


// delete video 
const deleteVideo = asyncHandler(async(req, res)=>{
  const {videoId}  = req.params

  if(!isValidObjectId(videoId)){
    throw new ApiError(400, "Invalid Video ID")
  }
   const video = Video.findById(videoId);
  
   if(!video){
    throw new ApiError(400 ,"video not found")
   }

   if(video?.owner._id !== req.user?._id){
    throw new ApiError(400 , "Onyl owner can delete the video")
   }
   
   await deleteOnCloudinary(video.thumbnail.public_id)
   await deleteOnCloudinary(video.videoFile.public_id, "video"); // specify video while deleting video

  
  await Video.findByIdAndDelete(videoId);

  await Like.deleteMany({
    video : videoId
  })
  await Comment.deleteMany({
    video : videoId
  })

  return res
  .status(200)
  .json(new ApiResponse(200, {} , "Video delete successfully"))

})

const toglePublishStatus =asyncHandler(async(req,res)=>{
  const {videoId } = req.params

  if(!isValidObjectId(videoId)){
    throw new ApiError(400, "Invalid video ID")
  }
   const video = await Video.findById(videoId)
   if (!video) {
    throw new ApiError(400 , "No video found")
    
   }

   if(video?.owner._id !== req.user?._id){
    throw new ApiError(400 , "Onyl owner can change the status")
   }
  
   const toggleVideoPublish = await Video.findByIdAndDelete(videoId,
    {
     $set :{
      isPublished: !video?.isPublished
     },
    
    },
     {new :true}
  ) 

  if (!toggleVideoPublish) {
    throw new ApiError(404, "Failed to toggle publish status")
    
  }
  return res.status(200)
  .json(new ApiResponse(200,{isPublished : toggleVideoPublish.isPublished}, "video publish toggled successfully"))


});




export {
  getAllVideos,
  publishVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  toglePublishStatus
}