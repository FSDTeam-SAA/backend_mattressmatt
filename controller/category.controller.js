import { Category } from "../model/category.model.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../errors/AppError.js";
import sendResponse from "../utils/sendResponse.js";
import { Music } from "../model/music.model.js";

export const createCategory = catchAsync(async (req, res) => {
  const { name } = req.body;

  const category = new Category({ name });
  await category.save();

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Category created successfully",
    data: category,
  });
});

export const getCategories = catchAsync(async (req, res) => {
  const categories = await Category.find();

  sendResponse(res, {
    statusCode: 200,
    success: true,
    data: categories,
  });
});

export const updateCategory = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;

  const category = await Category.findByIdAndUpdate(
    id,
    { name },
    { new: true, runValidators: true }
  );

  if (!category) throw new AppError("Category not found", 404);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Category updated successfully",
    category,
  });
});

export const deleteCategory = catchAsync(async (req, res) => {
  const { id } = req.params;

  const category = await Category.findByIdAndDelete(id);

  if (!category) throw new AppError("Category not found", 404);

  await Music.deleteMany({ category: id });

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Category deleted successfully",
  });
});
