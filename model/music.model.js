import mongoose from "mongoose";

const musicSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    artist: {
      type: String,
      required: true,
    },
    category: [{ type: mongoose.Schema.Types.ObjectId, ref: "Category" }],
    url: {
      type: String,
      required: true,
    },
    thumbnail: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

export const Music = mongoose.model("Music", musicSchema);
