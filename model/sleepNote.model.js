import  { Schema, model } from "mongoose";

const sleepNoteModel = new Schema({
  text: {
    type: String,
    required: [true, "text is required"],
  },
  Date: {
    type: Date,
    required: [true, "Date is required"],
  }
});

export const SleepNote = model("SleepNote", sleepNoteModel);
