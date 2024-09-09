import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import bodyParser from 'body-parser'




const app = express()


app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials : true
})) // it is used for accpeting request only permitted domain or URL


// app.use(bodyParser.json())
// app.use(bodyParser.urlencoded({ extended: true }))
app.use(express.json()) // for acccepting the jason data 
app.use(express.urlencoded({extended : true}))  // for encode the url adding some unique character or read the data come form URL
app.use(express.static("public")) // for storing the pdf and file store in our own browser
app.use(cookieParser())     //  user ke browser ki cokkie read and set the cookie of the user browser


//******routes import

import userRouter from './routes/user.routs.js'

// routs declaration
app.use("/api/v1/users",userRouter)
// http://localhost:8000/api/v1/users/register





export default app 