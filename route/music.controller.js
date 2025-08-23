import { express } from "express";

import {
  uploadMusic,
  getAllCategoriesWithMusic,
  allMusic,
  getMusicByCategory,
  deleteMusic,
} from "../controller/music.controller.js";

const router = express.Router();

router.post("/", uploadMusic);
router.get("/", allMusic);
router.get("/categoryWiseImages", getAllCategoriesWithMusic);
router.get("/:category", getMusicByCategory);
router.delete("/:id", deleteMusic);

export default router;
