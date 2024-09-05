import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'




const app = express()


app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials : true
})) // it is used for accpeting request only permitted domain or URL

app.use(express.json({limit : "20kb"})) // for acccepting the jason data 
app.use(express.urlencoded({extended : true, limit:"20kb"}))  // for encode the url adding some unique character or read the data come form URL
app.use(express.static("public")) // for storing the pdf and file store in our own browser
app.use(cookieParser())     //  user ke browser ki cokkie read and set the cookie of the user browser


export default app 