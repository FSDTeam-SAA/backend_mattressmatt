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
    music: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Music",
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Alarm", alarmSchema);
