import mongoose from "mongoose";
const sleepGoalSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    duration: {
      type: Number,
      required: true,
      min: 1,
      max: 14,
    },
    bedtime: {
      type: Date,
      required: true,
    },
    wakeUpTime: {
      type: Date,
      required: true,
    },
    days: [
      {
        type: String,
        enum: [
          "Sunday",
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
        ],
      },
    ],
    alarmTone: {
      type: {
        type: String,
        default: "default",
        enum: ["default", "media", "app"],
        required: true,
      },
      id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Music",
        default: null,
      },
      location: {
        type: String,
        default: null,
      },
    },
    customToneUrl: {
      type: String,
      default: null,
    },
    reminders: [
      {
        time: { type: Date, required: true },
        enabled: { type: Boolean, default: true },
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export const SleepGoal = mongoose.model("SleepGoal", sleepGoalSchema);
