import httpStatus from "http-status";
import { User } from "../model/user.model.js";
import { uploadOnCloudinary } from "../utils/commonMethod.js";
import AppError from "../errors/AppError.js";
import sendResponse from "../utils/sendResponse.js";
import catchAsync from "../utils/catchAsync.js";
import { inviteLinkTemplate, sendEmail } from "../utils/sendEmail.js";
import catchAsync from "./../utils/catchAsync";

// Get user profile
export const getProfile = catchAsync(async (req, res) => {
  const user = await User.findById(req.user._id).select(
    "-password -refreshToken -verificationInfo -password_reset_token"
  );
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Profile fetched successfully",
    data: user,
  });
});

// Update user profile
export const updateProfile = catchAsync(async (req, res) => {
  const { name, username, phone, street, city, state, zipCode } = req.body;
  const user = await User.findById(req.user._id);
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  // Update fields that are included in the request body
  if (name) user.name = name;
  if (username) user.username = username;
  if (phone) user.phone = phone;
  if (street) user.address.street = street;
  if (city) user.address.city = city;
  if (state) user.address.state = state;
  if (zipCode) user.address.zipCode = zipCode;

  // If avatar file is uploaded, process it
  if (req.file) {
    const result = await uploadOnCloudinary(req.file.buffer, {
      folder: "avatars",
    });
    user.avatar = {
      public_id: result.public_id,
      url: result.secure_url,
    };
  }

  await user.save();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Profile updated successfully",
    data: user,
  });
});

// Change user password
export const changePassword = catchAsync(async (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;
  const user = await User.findById(req.user._id).select("+password");
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  if (newPassword !== confirmPassword) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "New password and confirm password do not match"
    );
  }

  if (!(await User.isPasswordMatched(currentPassword, user.password))) {
    throw new AppError(
      httpStatus.UNAUTHORIZED,
      "Current password is incorrect"
    );
  }

  user.password = newPassword;
  await user.save();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Password changed successfully",
    data: user,
  });
});

// get all students with pagination by query
export const getAllStudents = catchAsync(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const skip = (page - 1) * limit;
  const students = await User.find({ role: "student" })
    .select("-password -refreshToken -verificationInfo -password_reset_token")
    .skip(skip)
    .limit(limit);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Students fetched successfully",
    data: students,
  });
});

export const addTrainerFromAdmin = catchAsync(async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Name, email and password are required"
    );
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new AppError(
      httpStatus.CONFLICT,
      "User with this email already exists"
    );
  }

  const generatedUsername = `${name
    .replace(/\s+/g, "")
    .toLowerCase()}${Math.floor(1000 + Math.random() * 9000)}`;

  const newTrainer = await User.create({
    name,
    email,
    password,
    username: generatedUsername,
    role: "trainer",
    verificationInfo: {
      verified: true,
      token: "",
    },
  });

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Trainer added successfully",
    data: {
      _id: newTrainer._id,
      name: newTrainer.name,
      email: newTrainer.email,
      username: newTrainer.username,
      role: newTrainer.role,
      verified: newTrainer.verificationInfo.verified,
    },
  });
});

export const getAllTrainer = catchAsync(async (req, res) => {
  const trainers = await User.find({ role: "trainer" })
    .populate("courses")
    .select("-password -refreshToken -verificationInfo -password_reset_token");

  if (!trainers || trainers.length === 0) {
    throw new AppError(httpStatus.NOT_FOUND, "No trainers found");
  }

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Trainers fetched successfully",
    data: trainers,
  });
});

export const deleteTrainer = catchAsync(async (req, res) => {
  const trainerId = req.params.id;

  const deletedTrainer = await User.findByIdAndDelete(trainerId);

  if (!deletedTrainer) {
    throw new AppError(httpStatus.NOT_FOUND, "Trainer not found");
  }

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Trainer deleted successfully",
    data: deletedTrainer,
  });
});

// export const getUserWiseOrderStatusSummary = catchAsync(
//   async (req, res) => {
//  const summary = await Order.aggregate([
//       {
//         $group: {
//           _id: {
//             user: "$customer",
//             status: "$status",
//           },
//           count: { $sum: 1 },
//         },
//       },
//       {
//         $group: {
//           _id: "$_id.user",
//           statusCounts: {
//             $push: {
//               status: "$_id.status",
//               count: "$count",
//             },
//           },
//         },
//       },
//       {
//         $project: {
//           user: "$_id",
//           _id: 0,
//           statusCounts: 1,
//           pending: {
//             $sum: {
//               $map: {
//                 input: {
//                   $filter: {
//                     input: "$statusCounts",
//                     as: "item",
//                     cond: { $eq: ["$$item.status", "pending"] },
//                   },
//                 },
//                 as: "item",
//                 in: "$$item.count",
//               },
//             },
//           },
//           completed: {
//             $sum: {
//               $map: {
//                 input: {
//                   $filter: {
//                     input: "$statusCounts",
//                     as: "item",
//                     cond: { $eq: ["$$item.status", "completed"] },
//                   },
//                 },
//                 as: "item",
//                 in: "$$item.count",
//               },
//             },
//           },
//                     shipping: {
//             $sum: {
//               $map: {
//                 input: {
//                   $filter: {
//                     input: "$statusCounts",
//                     as: "item",
//                     cond: { $eq: ["$$item.status", "shipping"] }
//                   }
//                 },
//                 as: "item",
//                 in: "$$item.count"
//               }
//             }
//           },
//           cancelled: {
//             $sum: {
//               $map: {
//                 input: {
//                   $filter: {
//                     input: "$statusCounts",
//                     as: "item",
//                     cond: { $eq: ["$$item.status", "cancelled"] },
//                   },
//                 },
//                 as: "item",
//                 in: "$$item.count",
//               },
//             },
//           },
//         },
//       },
//       {
//         $lookup: {
//           from: "users", // collection name in MongoDB
//           localField: "user",
//           foreignField: "_id",
//           as: "user",
//         },
//       },
//       {
//         $unwind: "$user",
//       },
//       {
//         $project: {
//           user: {
//             _id: 1,
//             name: 1,
//             email: 1,
//             phone: 1,
//           },
//           pending: 1,
//           completed: 1,
//           shipping: 1,
//           cancelled: 1,
//         },
//       },
//     ]);

//     sendResponse(res, {
//       statusCode: 200,
//       success: true,
//       message: "User-wise order status summary fetched successfully",
//       data: summary,
//     });
//   }
// );

// export const getOrdersWithAdminRevenue = catchAsync(
//   async (req, res) => {
//     const ordersWithRevenue = await Order.aggregate([
//       // 1) Lookup Farm data
//       {
//         $lookup: {
//           from: "farms",           // MongoDB collection name for Farm
//           localField: "farm",
//           foreignField: "_id",
//           as: "farm",
//         },
//       },
//       { $unwind: "$farm" },

//       // 2) Lookup Product data
//       {
//         $lookup: {
//           from: "products",       // MongoDB collection name for Product
//           localField: "product",
//           foreignField: "_id",
//           as: "product",
//         },
//       },
//       { $unwind: "$product" },

//       // 3) Project only the fields we need + compute adminRevenue = totalPrice * 4.99%
//       {
//         $project: {
//           _id: 0,
//           farm: {
//             _id: "$farm._id",
//             name: "$farm.name",
//           },
//           product: {
//             _id: "$product._id",
//             name: "$product.title",
//           },
//           adminRevenue: {
//             // 4.99% = 0.0499
//             $round: [{ $multiply: ["$totalPrice", 0.0499] }, 2],
//           },
//         },
//       },
//     ]);

//     sendResponse(res, {
//       statusCode: 200,
//       success: true,
//       message: "Fetched all orders with admin revenue (4.99%)",
//       data: ordersWithRevenue,
//     });
//   }
// );

// export const getOrdersWithAdminRevenue = catchAsync(async (req, res) => {
//   const ordersWithRevenue = await Order.aggregate([
//     // Unwind the products array to handle each product individually
//     { $unwind: "$products" },

//     // Lookup Farm details
//     {
//       $lookup: {
//         from: "farms",
//         localField: "farm",
//         foreignField: "_id",
//         as: "farm",
//       },
//     },
//     { $unwind: "$farm" },

//     // Lookup Product details
//     {
//       $lookup: {
//         from: "products",
//         localField: "products.product",
//         foreignField: "_id",
//         as: "product",
//       },
//     },
//     { $unwind: "$product" },

//     // Project necessary fields and calculate admin revenue per product
//     {
//       $project: {
//         _id: 0,
//         orderId: "$_id",
//         farm: {
//           _id: "$farm._id",
//           name: "$farm.name",
//         },
//         product: {
//           _id: "$product._id",
//           name: "$product.title",
//         },
//         quantity: "$products.quantity",
//         price: "$products.price",
//         totalPrice: "$products.totalPrice",
//         adminRevenue: {
//           $round: [{ $multiply: ["$products.totalPrice", 0.0499] }, 2],
//         },
//         orderDate: "$date",
//         orderStatus: "$status",
//         paymentStatus: "$paymentStatus",
//       },
//     },
//   ]);

//   sendResponse(res, {
//     statusCode: 200,
//     success: true,
//     message: "Fetched all orders with admin revenue (4.99%)",
//     data: ordersWithRevenue,
//   });
// });

// export const writeReview = catchAsync (async (req, res) =>{
//   const { review, rating,product, farm } = req.body;
//  const userId = req.user?._id; // assuming user is authenticated

//   if (!review || !rating || (!product && !farm)) {
//     throw new AppError(400, "Review, rating, and either product or farm are required");
//   }

//   const reviewData = {
//     text: review,
//     rating: Number(rating),
//     user: userId,
//   };

//   if (farm) {
//     const farmDoc = await Farm.findById(farm);
//     if (!farmDoc) {
//       throw new AppError(404, "Farm not found");
//     }
//     farmDoc.review.push(reviewData);
//     await farmDoc.save();
//   } else if (product) {
//     const productDoc = await Product.findById(product);
//     if (!productDoc) {
//       throw new AppError(404, "Product not found");
//     }
//     productDoc.review.push(reviewData);
//     await productDoc.save();
//   }

//   sendResponse(res, {
//     statusCode: 200,
//     success: true,
//     message: "Review submitted successfully",
//   });

// })

// export const getReviews = catchAsync(async (req, res) => {
//   const reviewDoc = await Review.find().populate("review.user", "name avatar");

//   if (!reviewDoc) {
//     throw new AppError(404, "No reviews found");
//   }

//   sendResponse(res, {
//     statusCode: 200,
//     success: true,
//     message: "Reviews fetched successfully",
//     data: reviewDoc,
//   });
// });

// export const writeReviewWebsite = catchAsync(async (req, res) => {
//   const { text, rating } = req.body;
//   const userId = req.user._id; // assuming user is authenticated

//   // Find the single review doc or create if it doesn't exist
//   let reviewDoc = await Review.findOne();

//   if (!reviewDoc) {
//     reviewDoc = await Review.create({
//       review: [{ text, rating, user: userId }],
//     });
//   } else {
//     reviewDoc.review.push({ text, rating, user: userId });
//     await reviewDoc.save();
//   }

//   sendResponse(res, {
//     statusCode: 201,
//     success: true,
//     message: "Review submitted successfully",
//     data: reviewDoc,
//   });
// });

// export const postcountClick = catchAsync(async (req, res) => {
//   const { id } = req.params;
//   await Ads.findByIdAndUpdate( id, { $inc: { clicked: 1 } }, { new: true });
//   sendResponse(res, {
//     statusCode: 200,
//     success: true,
//     message: "Click count updated successfully",
//     });
// })

// export const inviteUser = catchAsync(async (req, res) => {
//   const { email, message } = req.body;
//   const user = await User.findOne({ email });
//   if (user) {
//     throw new AppError( 404, "user already exist");
//   }

// const invite = await Invite.findOneAndUpdate(
//   { email }, // condition: check if email exists
//   { message }, // fields to update
//   { new: true, upsert: true } // create if not exists, return updated doc
// );

//     ////         TODO : send email to user
//     const html = inviteLinkTemplate("Admin", `http://localhost:8001/login?q=${invite._id}`)
//    await sendEmail(email, "Invite", html);

//     sendResponse(res, {
//       statusCode: 201,
//       success: true,
//       message: "Invite sent successfully",
//       data: invite,
//       });
// })

// export const postUserRating = catchAsync(async (req, res) => {
//   const { userId, category, star, comment } = req.body;

//   // Ensure the category is valid
//   const allowedCategories = ['competence', 'punctuality', 'behavior'];
//   if (!allowedCategories.includes(category)) {
//     throw new AppError(400, 'Invalid rating category');
//   }

//   // Find the user
//   const user = await User.findById(userId);
//   if (!user) {
//     throw new AppError(404, 'User not found');
//   }

//   // Update only the specified category
//   user.userRating[category] = {
//     star: star ?? user.userRating[category].star,
//     comment: comment ?? user.userRating[category].comment,
//   };

//   await user.save();

//   // res.status(200).json({
//   //   success: true,
//   //   message: `Rating for ${category} updated successfully`,
//   //   data: user.userRating,
//   // });
//   sendResponse(res, {
//     statusCode: 200,
//     success: true,
//     message: `Rating for ${category} updated successfully`,
//     data: user.userRating,
//     });
// });
