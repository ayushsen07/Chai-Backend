import mongoose from "mongoose";

const subscriptionSchema =  new mongoose.Schema({
    subscriber :{
        type : Schema.Types.ObjectId,  // one who is subscribing
        ref : "User"
    },
    channel :{
        types : Schema.Types.ObjectId,  // one whom is subscribing
        ref : "User"
    }

},{timestamps : true})

const Subscription = mongoose.model("Subscription" , subscriptionSchema)