import express from "express";

import {
  createCategory,
  getCategories,
  updateCategory,
  deleteCategory,
} from "../controller/category.controller.js";
import upload from "../middleware/multer.middleware.js";

const router = express.Router();

router.post("/", upload.single("thumbnail"), createCategory);
router.get("/", getCategories);
router.patch("/:id", upload.single("thumbnail"), updateCategory);
router.delete("/:id", deleteCategory);

export default router;
