import mongoose from "mongoose";

const termsSchema = new mongoose.Schema(
  {
    content: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

export const Terms = mongoose.model("Terms", termsSchema);
