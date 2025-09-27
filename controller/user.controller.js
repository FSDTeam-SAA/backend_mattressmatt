import httpStatus from "http-status";
import { User } from "../model/user.model.js";
import AppError from "../errors/AppError.js";
import sendResponse from "../utils/sendResponse.js";
import catchAsync from "../utils/catchAsync.js";
import { Music } from "../model/music.model.js";
import { Alarm } from "../model/alarm.model.js";

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

// Update profile
export const updateProfile = catchAsync(async (req, res) => {
  const { name, phone, gender, dob } = req.body;

  // Find user
  const user = await User.findById(req.user._id);
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  // Update only provided fields
  if (name) user.name = name;
  if (phone) user.phone = phone;
  if (gender) user.gender = gender;
  if (dob) user.dob = dob;

  if (req.file) {
    user.avatar = {
      public_id: req.file.filename,
      url: `/public/temp/${req.file.filename}`,
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

// Get all user
export const getAllUser = catchAsync(async (req, res) => {
  const users = await User.find();
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Users fetched successfully",
    data: users,
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



export const getDashboardStats = catchAsync(
  async (req, res, next) => {
    // Total users
    const totalUsers = await User.countDocuments();

    // Music tracks
    const totalTracks = await Music.countDocuments();

    // Total plays → assume each alarm that has a music assigned = play count
    const totalPlaysAgg = await Alarm.aggregate([
      { $match: { "music.id": { $ne: null } } },
      { $count: "totalPlays" },
    ]);
    const totalPlays = totalPlaysAgg.length > 0 ? totalPlaysAgg[0].totalPlays : 0;

    // Average rating → if you have a Review model, replace with real logic
    const avgRating = 4.5; // placeholder
    const reviewsCount = 1234; // placeholder

    // User activity in last 7 days
    const today = new Date();
    const lastWeek = new Date();
    lastWeek.setDate(today.getDate() - 6);

    const userActivity = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: lastWeek },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Most played music (mock since plays not tracked properly)
    const mostPlayed = await Music.find().limit(5).lean();

    // Recently added music
    const recentMusic = await Music.find().sort({ createdAt: -1 }).limit(5).lean();

    // Final response
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Dashboard data fetched successfully",
      data: {
        totalUsers,
        totalTracks,
        totalPlays,
        avgRating,
        reviewsCount,
        userActivity,
        mostPlayed,
        recentMusic,
      },
    });
  }
);