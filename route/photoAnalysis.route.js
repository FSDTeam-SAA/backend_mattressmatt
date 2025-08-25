import express from "express";

 
import { photoAnalysis } from "../controller/photoAnalysis.js";
import upload from "../middleware/multer.middleware.js";

const router = express.Router();

router.post("/",upload.single("image"), photoAnalysis);
// router.get("/privacy-policy", getPrivacyPolicy);


export default router;
