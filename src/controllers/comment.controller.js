import mongoose , { Schema } from "mongoose";
import { Like } from "../models/likes.model.js";
import { Comment } from "../models/comment.model.js";
import ApiResponse from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { Video } from "../models/video.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { configDotenv } from "dotenv";


// get comment
const getComment = asyncHandler(async(req , res)=>{
    const {videoId} = req.params
    const {page =1, limit = 10} = req.query


    const video= await Video.findById(videoId)

    if (!video) {
        throw new ApiError(400, "video not found")
    }

    const commentsAggregate = Video.aggregate([
        {
            $lookup :{
                from :"users",
                localField :"owner",
                foreignField :"_id",
                as :"owner"
            }
        },
        {
            $lookup:{
                from:"likes",
                localField:"_id",
                foreignField:"comment",
                as :"likes"
            }
        },
        {
            $addFields:{
                likesCount :{
                    $size : "$likes"
                },
                owner:{
                    $first : "$owner"
                },
                isLiked :{
                    $cond :{
                        if:{$in : [re.user?._id , "$likes.likedBy"] },
                        than : true,
                        else : false
                    }
                }
            }
        },
        {
            $sort:{
                createdAt :-1
            }
        },
        {
            $project: {
                content: 1,
                createdAt: 1,
                likesCount: 1,
                owner: {
                    username: 1,
                    fullName: 1,
                    "avatar.url": 1
                },
                isLiked: 1
            }
        }
    ]);

    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10)
    };

    const comments = await Comment.aggregatePaginate(
        commentsAggregate,
        options
    );

    return res
        .status(200)
        .json(new ApiResponse(200, comments, "Comments fetched successfully"));
});
    
// add comment
const addComment = asyncHandler(async(req , res)=>{
    const {content} = req.body
    const {videoId} = req.params

    if(!content){
        throw new ApiError(400, "content is required")
    }

    const video = await Video.findById(videoId)

    if (!video) {
        throw new ApiError(400, "video not found")
        
    }

    const comment = await Comment.create({
        content,
        owner : req.user?._id,
        video : videoId
    }) 

    if (!comment) {
        throw new ApiError(404,"comment is failed")
    }

    return res
    .status(200)
    .json( new ApiResponse(200 , comment, " comment is succesfully"))
 
})

//update comment

const updateComment = asyncHandler(async(req,res)=>{
    const {content} = req.body
    //const {videoId} = req.params
    const {commentId} = req.params

    if(!content){
        throw new ApiError(400, "content is required")
    }

    const comment = await Comment.findById(commentId)
    if(!comment){
        throw new ApiError(400, "comment not found ")
    }

    if(comment?.owner.toString()!==req.user?._id.toString()){
        throw new ApiError(404,"Only owner can edit the comment")
    }

    const updatedComment = await Comment.findByIdAndUpdate(comment?._id,
        {
            $set:{
                content
            }
        },
        {
            new :true
        }

    )

    if (!updateComment) {
        throw new ApiError(400,"comment updation failed ! try agian")
        
    }
    return res
    .status(200)
    .json(new ApiResponse(200 , updateComment , "comment updated"))
})

// delete comment
const deleteComment = asyncHandler(async(req,res)=>{
    const {commentId} = req.params
    if(!commentId){
        throw new ApiError(400 ,"comment not found")
    }

    if(comment?.owner.toString()!==req.user?._id){
        throw new ApiError(400,"only owner can delete the comment")
    }

     await Comment.findByIdAndDelete(commentId)

     await Like.deleteMany({
        comment : commentId,
        likedBy : req.user
     })

     return res.status(200)
     .json(new ApiResponse(200,{commentId} , "comment deleted"))
})













export {
    getComment,
    addComment,
    updateComment,
    deleteComment,
}