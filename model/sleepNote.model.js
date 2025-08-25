const { Schema, model } = require("mongoose");

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

const SleepNote = model("SleepNote", sleepNoteModel);
module.exports = SleepNote;
