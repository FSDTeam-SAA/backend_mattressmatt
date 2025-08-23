import express from "express";
import {
  createSleepGoal,
  getSleepGoal,
  updateSleepGoal,
  deleteSleepGoal,
} from "../controller/sleepGoal.controller.js";

const router = express.Router();

router.post("/", createSleepGoal);
router.get("/:id", getSleepGoal);
router.put("/:id", updateSleepGoal);
router.delete("/:id", deleteSleepGoal);

export default router;
