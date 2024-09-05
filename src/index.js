// require('dotenv').config({path : './env'})
import dotenv from 'dotenv'
dotenv.config()

import mongoose from "mongoose";
import connectDB from "./db/index.js";



connectDB()
.then(() =>{
    app.listen(process.env.PORT || 8000, ()=>{
        console.log(`server is running at port : ${process.env.PORT}`)
    })
})
.catch((err) =>{
    console.log("MONGO db connection failed !!!" , err);
    
})