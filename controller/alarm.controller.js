import { Alarm } from "../model/alarm.model.js";
import catchAsync from "../utils/catchAsync.js";
import sendResponse from "../utils/sendResponse.js";
import AppError from "../errors/AppError.js";
import { Music } from "../model/music.model.js";

export const createAlarm = catchAsync(async (req, res) => {
  const { time, duration, wakeUpPhase, musicType, musicId } = req.body;
  const userId = req.user?._id;

  if (!userId) throw new AppError(401, "Unauthorized");

  let musicData = { type: musicType || "default", id: null, location: null };

  if (musicType === "default") {
    const defaultMusic = await Music.findOne({ isDefault: true });
    if (defaultMusic) musicData.id = defaultMusic._id;
  } else if (musicType === "media" && req.file) {
    musicData.location = `/temp/${req.file.filename}`;
  } else if (musicType === "app" && musicId) {
    const music = await Music.findById(musicId);
    if (music) musicData.id = music._id;
  }

  const alarm = await Alarm.create({
    user: userId,
    time,
    duration,
    wakeUpPhase,
    music: musicData,
  });

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Alarm created successfully",
    data: alarm,
  });
});

export const updateAlarm = catchAsync(async (req, res) => {
  const { musicType, musicId } = req.body;
  const userId = req.user?._id;

  if (!userId) throw new AppError(401, "Unauthorized");

  let musicData;
  if (musicType) {
    musicData = { type: musicType, id: null, location: null };
    if (musicType === "default") {
      const defaultMusic = await Music.findOne({ isDefault: true });
      if (defaultMusic) musicData.id = defaultMusic._id;
    } else if (musicType === "media" && req.file) {
      musicData.location = `/temp/${req.file.filename}`;
    } else if (musicType === "app" && musicId) {
      const music = await Music.findById(musicId);
      if (music) musicData.id = music._id;
    }
  }

  const alarm = await Alarm.findOneAndUpdate(
    { _id: req.params.id, user: userId },
    { ...req.body, music: musicData },
    { new: true, runValidators: true }
  );

  if (!alarm) throw new AppError("Alarm not found or unauthorized", 404);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Alarm updated successfully",
    data: alarm,
  });
});

export const getUserAlarms = catchAsync(async (req, res) => {
  const alarms = await Alarm.find({ user: req.user._id }).populate("music.id");

  sendResponse(res, {
    statusCode: 200,
    success: true,
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

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Alarm fetched successfully",
    data: alarm,
  });
});

export const deleteAlarm = catchAsync(async (req, res) => {
  const alarm = await Alarm.findOneAndDelete({
    _id: req.params.id,
    user: req.user._id,
  });

  if (!alarm) throw new AppError("Alarm not found or unauthorized", 404);

  sendResponse(res, {
    statusCode: 200,
    success: true,
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
