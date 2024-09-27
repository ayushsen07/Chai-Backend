import mongoose, { isValidObjectId } from "mongoose";
import Tweet from "../models/tweet.model.js"
import { User } from "../models/user.model.js";
import ApiResponse from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Like } from "../models/likes.model.js";


// create a tweet
const createTweet = asyncHandler(async(req,res)=>{
    const {content} = req.body
    if (!content) {
        throw new ApiError(400,"content is required")
    }
    const tweet = await Tweet.create({
        content,
        owner : req.user?._id
    }) 

    if(!tweet){
        throw new ApiError(400,"failed to create tweet please try again")
    }
    return res
    .status(200)
    .json(new ApiResponse(200 , tweet , "Tweet is successfully"))
})


// get user tweets
const getUserTweets = asyncHandler(async(req,res)=>{
     const {userId} = req.params

     if(!isValidObjectId(userId)){
        throw new ApiError(400,"Invalid user")
     }

     const tweets = await Tweet.aggregate([
        {
            $match :{
                owner: mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup:{
                from :"users",
                localField :"owner",
                foreignFeild :"_id",
                as:"ownerdetails",

                pipeline: [
                    {
                        $project:{
                            username :1,
                            "avatar.url":1
                        }
                    }
                ]
            }

        },
        {
            $lookup:{
                from : "likes",
                localField:"_id",
                foreignFeild:"tweet",
                as :"likeDetails",

                pipeline:[
                    {
                        $project :{
                            likedBy:1
                        }
                    }
                ]

            }
        },
        {
            $addFields: {
                likesCount: {
                    $size: "$likeDetails",
                },
                ownerDetails: {
                    $first: "$ownerDetails",
                },
                isLiked: {
                    $cond: {
                        if: {$in: [req.user?._id, "$likeDetails.likedBy"]},
                        then: true,
                        else: false
                    }
                }
            },
        },
        {
            $sort: {
                createdAt: -1
            }
        },
        {
            $project: {
                content: 1,
                ownerDetails: 1,
                likesCount: 1,
                createdAt: 1,
                isLiked: 1
            },
        },
    ]);
    return res

        .status(200)
        .json(new ApiResponse(200, tweets, "Tweets fetched successfully"));
});

// update tweet
const updateTweet = asyncHandler(async(req, res)=>{
    const {content} = req.body
    const {tweetId} = req.params
})

if(!isValidObjectId(isValidObjectId(tweetId))){
    throw new ApiError(400, "Invalid tweetId")
}
if (!content) {
    throw new ApiError(404, "content is required")
}

const tweet = await Tweet.findById(tweetId)
if (!tweet) {
    throw new ApiError(400, "tweet not found")
}

if(tweet?.owner.toString() !== req.user?._id.toString()){
    throw new ApiError(404,"only owner can update the tweet")
}

const newTweet = await Tweet.findByIdAndUpdate(tweetId,{
       $set:{
        content
       }
   }, 
   {new :true}
);
if (!newTweet) {
    throw new ApiError(404,"Tweet update is failed!! try again")
}

return res
.status(200)
.json(new ApiResponse(200, newTweet , "tweet update successfully"))


//delete tweets
const deleteTweet = asyncHandler(async(req,res)=>{
    const {tweetId} = req.params
    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400,"Tweet ID Invalid")
    }

    const tweet = await Tweet.findById(tweetId)

    if (!tweet) {
        throw new ApiError(400 ,"tweet not found")
    }

    if (Tweet?.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(404,"only owner can delete the tweet")
    }
    await Tweet.findByIdAndDelete(tweetId)

    // Like.deleteMany({
    //     tweet : tweetId,
    //     likedBy : req.user
    // })

    return res
    .status(200)
    .json(new ApiResponse(200 , {tweetId} , "tweet deleted"))
})














export {
    createTweet,
    getUserTweets,
    deleteTweet
    
}