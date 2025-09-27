import express from "express";
import {
  getProfile,
  getAllUser,
  updateProfile,
  changePassword,
  getDashboardStats,
} from "../controller/user.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import upload from "../middleware/multer.middleware.js";

const router = express.Router();

router.get("/profile", protect, getProfile);
router.get("/all", getAllUser);
router.get("/dashboard", getDashboardStats);
router.patch(
  "/update-profile",
  protect,
  upload.single("avatar"),
  updateProfile
);
router.post("/change-password", protect, changePassword);

export default router;
