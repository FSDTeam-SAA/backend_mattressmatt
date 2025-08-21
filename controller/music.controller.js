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

  const fileUrl = `/temp/${req.files.audioFile[0].filename}`;

  const thumbnailUrl = req.files.thumbnail
    ? `/temp/${req.files.thumbnail[0].filename}`
    : null;

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
    thumbnail: thumbnailUrl,
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

export const getMusicByCategory = catchAsync(async (req, res) => {
  const { category } = req.params;

  const query = category ? { category } : {};
  const music = await Music.find(query).populate("category", "name");

  if (!music.length) {
    throw new AppError(404, "No music found");
  }

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Music fetched successfully",
    data: music,
  });
});

// get all category with music
export const getAllCategoriesWithMusic = catchAsync(async (req, res) => {
  const categories = await Category.find().populate("music", "title artist");

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "All categories with music fetched successfully",
    data: categories,
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
