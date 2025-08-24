import { Alarm } from "../model/alarm.model.js";
import catchAsync from "../utils/catchAsync.js";
import sendResponse from "../utils/sendResponse.js";
import AppError from "../errors/AppError.js";

export const createAlarm = catchAsync(async (req, res) => {
  const { time, duration, wakeUpPhase, music } = req.body;

  const alarm = await Alarm.create({
    user: req.user._id,
    time,
    duration,
    wakeUpPhase,
    music,
  });

  sendResponse(res, {
    statusCode: 201,
    status: true,
    message: "Alarm created successfully",
    data: alarm,
  });
});

export const getUserAlarms = catchAsync(async (req, res) => {
  const alarms = await Alarm.find({ user: req.user._id }).populate("music.id");

  sendResponse(res, 200, {
    message: "Alarms fetched successfully",
    data: alarms,
  });
});

export const getAlarmById = catchAsync(async (req, res) => {
  const alarm = await Alarm.findOne({
    _id: req.params.id,
    user: req.user._id,
  }).populate("music.id");

  if (!alarm) throw new AppError("Alarm not found", 404);

  sendResponse(res, 200, {
    message: "Alarm fetched successfully",
    data: alarm,
  });
});

export const updateAlarm = catchAsync(async (req, res) => {
  const alarm = await Alarm.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    req.body,
    { new: true, runValidators: true }
  );

  if (!alarm) throw new AppError("Alarm not found or unauthorized", 404);

  sendResponse(res, {
    statusCode: 200,
    status: true,
    message: "Alarm updated successfully",
    data: alarm,
  });
});

export const deleteAlarm = catchAsync(async (req, res) => {
  const alarm = await Alarm.findOneAndDelete({
    _id: req.params.id,
    user: req.user._id,
  });

  if (!alarm) throw new AppError("Alarm not found or unauthorized", 404);

  sendResponse(res, 200, {
    message: "Alarm deleted successfully",
  });
});

export const toggleAlarm = catchAsync(async (req, res) => {
  const alarm = await Alarm.findOne({ _id: req.params.id, user: req.user._id });

  if (!alarm) throw new AppError("Alarm not found or unauthorized", 404);

  alarm.enabled = !alarm.enabled;
  await alarm.save();

  sendResponse(res, {
    statusCode: 200,
    status: true,
    message: `Alarm ${alarm.enabled ? "enabled" : "disabled"} successfully`,
    data: alarm,
  });
});

export const updateWakeUpPhase = catchAsync(async (req, res) => {
  const { wakeUpPhase } = req.body;

  // validation
  if (wakeUpPhase === undefined || typeof wakeUpPhase !== "number") {
    throw new AppError("wakeUpPhase (number) is required", 400);
  }

  const alarm = await Alarm.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    { wakeUpPhase },
    { new: true, runValidators: true }
  );

  if (!alarm) throw new AppError("Alarm not found or unauthorized", 404);

  sendResponse(res, {
    statusCode: 200,
    status: true,
    message: "Wake up phase updated successfully",
    data: alarm,
  });
});
