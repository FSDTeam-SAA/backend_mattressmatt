import { PrivacyPolicy } from "../model/privacyPolicy.model.js";
import catchAsync from "../utils/catchAsync.js";
import sendResponse from "../utils/sendResponse.js";
import AppError from "../errors/AppError.js";
import { Terms } from "../model/terms.model.js";

// Add or Update Privacy Policy
export const addUpdatePrivacyPolicy = catchAsync(async (req, res) => {
  const { content } = req.body;

  if (!content) {
    throw new AppError("Content is required", 400);
  }

  const privacyPolicy = await PrivacyPolicy.findOneAndUpdate(
    {},
    { content },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  sendResponse(res, 200, {
    message: "Privacy policy updated successfully",
    data: privacyPolicy,
  });
});

// Get Privacy Policy
export const getPrivacyPolicy = catchAsync(async (req, res) => {
  const privacyPolicy = await PrivacyPolicy.findOne({});

  sendResponse(res, 200, {
    message: "Privacy policy retrieved successfully",
    data: privacyPolicy,
  });
});

// Add or Update terms and condition
export const addUpdateTermsCondition = catchAsync(async (req, res) => {
  const { content } = req.body;

  if (!content) {
    throw new AppError("Content is required", 400);
  }

  const termsCondition = await Terms.findOneAndUpdate(
    {},
    { content },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  sendResponse(res, 200, {
    message: "Terms and conditions updated successfully",
    data: termsCondition,
  });
});

// Get Terms and Conditions
export const getTermsCondition = catchAsync(async (req, res) => {
  const termsCondition = await Terms.findOne({});

  sendResponse(res, 200, {
    message: "Terms and conditions retrieved successfully",
    data: termsCondition,
  });
});
