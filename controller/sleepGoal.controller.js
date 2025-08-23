import AppError from "../errors/AppError.js";
import sendResponse from "../utils/sendResponse.js";
import catchAsync from "../utils/catchAsync.js";
import { SleepGoal } from "./../model/sleepGoal.model.js";
import { Music } from "../model/music.model.js";

// Create a new sleep goal
export const createSleepGoal = catchAsync(async (req, res) => {
  const { duration, bedtime, wakeUpTime, days, alarmTone, reminders } =
    req.body;
  const userId = req.user?._id;

  if (!userId) {
    throw new AppError(401, "Unauthorized");
  }

  let alarmToneData = {
    type: alarmTone || "default",
    id: null,
    location: null,
  };
  if (alarmTone === "default") {
    const defaultTone = await Music.findOne({ isDefault: true });
    if (defaultTone) alarmToneData.id = defaultTone._id;
  } else if (alarmTone === "media" && req.file) {
    alarmToneData.location = `/temp/${req.file.filename}`;
  } else if (alarmTone === "app" && req.body.musicId) {
    const music = await Music.findById(req.body.musicId);
    if (music) alarmToneData.id = music._id;
  }

  const goal = new SleepGoal({
    userId,
    duration: parseInt(duration),
    bedtime: new Date(bedtime),
    wakeUpTime: new Date(wakeUpTime),
    days: days ? days.split(",") : [],
    alarmTone: alarmToneData,
    customToneUrl:
      alarmTone === "media" && req.file ? `/temp/${req.file.filename}` : null,
    reminders: reminders
      ? JSON.parse(reminders).map((r) => ({
          time: new Date(r.time),
          enabled: r.enabled,
        }))
      : [],
  });
  await goal.save();

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Sleep goal created successfully",
    data: goal,
  });
});

// Get user's active sleep goal
export const getSleepGoal = catchAsync(async (req, res) => {
  const userId = req.user?._id;

  if (!userId) {
    throw new AppError(401, "Unauthorized");
  }

  const goal = await SleepGoal.findOne({ userId, isActive: true })
    .sort({ updatedAt: -1 })
    .populate("alarmTone.id");
  if (!goal) {
    throw new AppError(404, "No active sleep goal found");
  }

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Sleep goal fetched successfully",
    data: goal,
  });
});

// Update sleep goal
export const updateSleepGoal = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { duration, bedtime, wakeUpTime, days, alarmTone, reminders, musicId } =
    req.body;
  const userId = req.user?._id;

  if (!userId) {
    throw new AppError(401, "Unauthorized");
  }

  let alarmToneData = {};
  if (req.body.alarmTone) {
    alarmToneData.type = alarmTone;
    if (alarmTone === "default") {
      const defaultTone = await Music.findOne({ isDefault: true });
      if (defaultTone) alarmToneData.id = defaultTone._id;
      alarmToneData.location = null;
    } else if (alarmTone === "media" && req.file) {
      alarmToneData.location = `/temp/${req.file.filename}`;
      alarmToneData.id = null;
    } else if (alarmTone === "app" && musicId) {
      const music = await Music.findById(musicId);
      if (music) alarmToneData.id = music._id;
      alarmToneData.location = null;
    }
  }

  const goal = await SleepGoal.findOneAndUpdate(
    { _id: id, userId },
    {
      duration: parseInt(duration),
      bedtime: new Date(bedtime),
      wakeUpTime: new Date(wakeUpTime),
      days: days ? days.split(",") : [],
      alarmTone: alarmToneData.type ? alarmToneData : undefined,
      customToneUrl:
        alarmTone === "media" && req.file
          ? `/temp/${req.file.filename}`
          : undefined,
      reminders: reminders
        ? JSON.parse(reminders).map((r) => ({
            time: new Date(r.time),
            enabled: r.enabled,
          }))
        : [],
      updatedAt: Date.now(),
    },
    { new: true, runValidators: true }
  );
  if (!goal) {
    throw new AppError(404, "Sleep goal not found");
  }

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Sleep goal updated successfully",
    data: goal,
  });
});

// Delete sleep goal
export const deleteSleepGoal = catchAsync(async (req, res) => {
  const { id } = req.params;
  const userId = req.user?._id;

  if (!userId) {
    throw new AppError(401, "Unauthorized");
  }

  const goal = await SleepGoal.findOneAndDelete({ _id: id, userId });
  if (!goal) {
    throw new AppError(404, "Sleep goal not found");
  }

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Sleep goal deleted successfully",
  });
});
