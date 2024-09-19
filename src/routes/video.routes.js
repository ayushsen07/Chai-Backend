import  Router  from "express";
import {getAllVideos} from '../controllers/video.controller.js'

const router = Router()


router.route("/").get(getAllVideos)





export default router