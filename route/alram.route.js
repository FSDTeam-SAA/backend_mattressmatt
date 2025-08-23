import express from "express";
import {
  createAlarm,
  getUserAlarms,
  getAlarmById,
  updateAlarm,
  deleteAlarm,
  toggleAlarm,
  updateWakeUpPhase,
} from "../controller/alarm.controller.js";

const router = express.Router();

router.use(authMiddleware);

router.post("/", createAlarm);
router.get("/", getUserAlarms);
router.get("/:id", getAlarmById);
router.put("/:id", updateAlarm);
router.delete("/:id", deleteAlarm);
router.patch("/:id/toggle", toggleAlarm);
router.patch("/:id/wakeUpPhase", updateWakeUpPhase);

export default router;
