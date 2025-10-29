import express from "express";

import {
  uploadMusic,
  allMusic,
  mostPlayedMusic,
  deleteMusic,
  getCategorywiseMusic,
  getOverview,
} from "../controller/music.controller.js";
import upload from "../middleware/multer.middleware.js";

const router = express.Router();

router.post("/", upload.single("audioFile"), uploadMusic);
router.get("/", allMusic);
router.get("/overview", getOverview);
router.get("/categoryWiseMusic/:categoryId", getCategorywiseMusic);
router.get("/mostPlayed", mostPlayedMusic);
router.delete("/:id", deleteMusic);

export default router;
