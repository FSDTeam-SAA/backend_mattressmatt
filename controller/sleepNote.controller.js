import AppError from "../errors/AppError.js";
import catchAsync from "../utils/catchAsync.js";
import sendResponse from "../utils/sendResponse.js";
import { SleepNote } from './../model/sleepNote.model.js';



/**
 * Create Sleep Note
 */
export const createSleepNote = catchAsync(async (req, res, next) => {
  const { text, Date: noteDate } = req.body;

  if (!text || !noteDate) {
    throw new AppError(400, "Text and Date are required");
  }

  const sleepNote = await SleepNote.create({
    text,
    Date: noteDate,
  });

  return sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Sleep note created successfully",
    data: sleepNote,
  });
});

/**
 * Get all sleep notes
 */
export const getSleepNotes = catchAsync(async (req, res, next) => {
  const notes = await SleepNote.find().sort({ Date: -1 });

  return sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Sleep notes fetched successfully",
    data: notes,
  });
});

/**
 * Get single sleep note
 */
export const getSleepNoteById = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const note = await SleepNote.findById(id);
  if (!note) throw new AppError(404, "Sleep note not found");

  return sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Sleep note fetched successfully",
    data: note,
  });
});

/**
 * Update sleep note
 */
export const updateSleepNote = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { text, Date: noteDate } = req.body;

  const note = await SleepNote.findByIdAndUpdate(
    id,
    { text, Date: noteDate },
    { new: true, runValidators: true }
  );

  if (!note) throw new AppError(404, "Sleep note not found");

  return sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Sleep note updated successfully",
    data: note,
  });
});

/**
 * Delete sleep note
 */
export const deleteSleepNote = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const note = await SleepNote.findByIdAndDelete(id);
  if (!note) throw new AppError(404, "Sleep note not found");

  return sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Sleep note deleted successfully",
    data: note,
  });
});
