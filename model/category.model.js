import mongoose from "mongoose";

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
      public_id: { type: String, default: null },
      url: { type: String, default: null },
    },
  },
  { timestamps: true }
);

export const Category = mongoose.model("Category", categorySchema);
