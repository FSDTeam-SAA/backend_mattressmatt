import AppError from "../errors/AppError.js";
import sendResponse from "../utils/sendResponse.js";
import catchAsync from "../utils/catchAsync.js";
import fs from "fs";
import path from "path";
import { Music } from "../model/music.model.js";
import { Category } from "../model/category.model.js";

// Upload music with category
export const uploadMusic = catchAsync(async (req, res) => {
  const { title, artist, category } = req.body;

  const fileUrl = `/temp/${req.file.filename}`;

  if (!category) {
    throw new AppError(400, "Category is required");
  }

  const categoryDoc = await Category.findById(category);
  if (!categoryDoc) {
    throw new AppError(400, "Category not found");
  }

  const music = new Music({
    title,
    artist,
    category,
    url: fileUrl,
  });
  await music.save();

  categoryDoc.trackCount += 1;
  await categoryDoc.save();

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Music uploaded successfully",
    data: music,
  });
});

// Get all music
export const allMusic = catchAsync(async (req, res) => {
  const music = await Music.find()
    .populate("category", "name")
    .sort({ createdAt: -1 })
    .limit(10);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "All music fetched successfully",
    data: music,
  });
});

// Most played  music
export const mostPlayedMusic = catchAsync(async (req, res) => {
  const music = await Music.find()
    .populate("category", "name")
    .sort({ playCount: -1 })
    .limit(10);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Most played music fetched successfully",
    data: music,
  });
});

export const getCategorywiseMusic = catchAsync(async (req, res) => {
  const { categoryId } = req.params;

  const music = await Music.find({ category: categoryId })
    .populate("category", "name")
    .sort({ createdAt: -1 });

  if (!music.length) {
    throw new AppError(404, "No music found for this category");
  }

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Category-wise music fetched successfully",
    data: music,
  });
});

// Delete music
export const deleteMusic = catchAsync(async (req, res) => {
  const { id } = req.params;

  const music = await Music.findByIdAndDelete(id);
  if (!music) {
    throw new AppError(404, "Music not found");
  }

  const category = await Category.findById(music.category);
  if (category) {
    category.trackCount -= 1;
    await category.save();
  }

  // Optionally delete files from disk
  if (fs.existsSync(path.join("public", music.url))) {
    fs.unlinkSync(path.join("public", music.url));
  }
  if (music.thumbnail && fs.existsSync(path.join("public", music.thumbnail))) {
    fs.unlinkSync(path.join("public", music.thumbnail));
  }

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Music deleted successfully",
  });
});
