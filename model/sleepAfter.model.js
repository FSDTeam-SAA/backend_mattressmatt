import mongoose from "mongoose";

const sleepAfterSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  music: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Music",
    required: true,
  },
  duration: {
    type: Number,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export const SleepAfter = mongoose.model("SleepAfter", sleepAfterSchema);
