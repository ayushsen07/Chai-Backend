import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.model.js"
import { User } from "../models/user.model.js"
import ApiResponse from "../utils/ApiResponse.js"
import { ApiError } from "../utils/ApiError.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { uploadOnCloudinary } from "../utils/cloudnary.js"






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




export {
  getAllVideos,

}