import express from "express";

import {
  uploadMusic,
  getAllCategoriesWithMusic,
  allMusic,
  getMusicByCategory,
  mostPlayedMusic,
  deleteMusic,
} from "../controller/music.controller.js";

const router = express.Router();

router.post("/", uploadMusic);
router.get("/", allMusic);
router.get("/categoryWiseImages", getAllCategoriesWithMusic);
router.get("/:category", getMusicByCategory);
router.get("/mostPlayed", mostPlayedMusic);
router.delete("/:id", deleteMusic);

export default router;
