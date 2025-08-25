import mongoose from "mongoose";

const alarmSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    time: {
      type: Date,
    },
    duration: {
      type: Number,
      default: null,
    },
    enabled: {
      type: Boolean,
      default: true,
    },
    wakeUpPhase: {
      type: Number,
      default: 5,
    },
    music: {
      type: {
        type: String,
        default: "default",
        enum: ["default", "media", "app"],
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
  },
  { timestamps: true }
);

export const Alarm = mongoose.model("Alarm", alarmSchema);
