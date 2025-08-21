import mongoose from "mongoose";
import { Chat } from "./chat.modal";

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
    },
    trackCount: {
      type: Number,
      default: 0,
    },
    thumbnail: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

export const Category = mongoose.model("Category", categorySchema);
