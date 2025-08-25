import express from "express";
import {
  createSleepGoal,
  getSleepGoal,
  updateSleepGoal,
  deleteSleepGoal,
} from "../controller/sleepGoal.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/", protect, createSleepGoal);
router.get("/:id", protect, getSleepGoal);
router.patch("/:id", protect, updateSleepGoal);
router.delete("/:id", protect, deleteSleepGoal);

export default router;
