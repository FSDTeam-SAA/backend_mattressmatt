import { express } from "express";

import {
  uploadMusic,
  getAllCategoriesWithMusic,
  getMusicByCategory,
  deleteMusic,
} from "../controller/music.controller.js";

const router = express.Router();

router.post("/", uploadMusic);
router.get("/categoryWiseImages", getAllCategoriesWithMusic);
router.get("/:category", getMusicByCategory);
router.delete("/:id", deleteMusic);

export default router;
