import mongoose, { Schema, Document, Model } from "mongoose";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const userSchema = new Schema(
  {
    uniqueId: {
      type: String,
      unique: true,
      default: () => crypto.randomInt(1000, 9999).toString(),
    },
    name: { type: String },
    email: { type: String, required: true, unique: true },
    password: { type: String, select: 0, required: true },
    username: { type: String, required: true, unique: true },
    phone: { type: String },
    credit: { type: Number, default: null },
    role: {
      type: String,
      default: "student",
      enum: ["trainer", "student", "admin"],
    },
    stripeAccountId: { type: String, default: "" },
    isStripeOnboarded: { type: Boolean, default: false },

    avatar: {
      public_id: { type: String, default: "" },
      url: { type: String, default: "" },
    },
    address: {
      street: { type: String, default: "" },
      city: { type: String, default: "" },
      state: { type: String, default: "" },
      zipCode: { type: String, default: "" },
    },
    verificationInfo: {
      verified: { type: Boolean, default: false },
      token: { type: String, default: "" },
    },
    password_reset_token: { type: String, default: "" },
    fine: { type: Number, default: 0 },
    refreshToken: { type: String, default: "" },
    userRating: {
      competence: {
        star: {
          type: Number,
          default: 5,
        },
        comment: {
          type: String,
          default: "",
        },
      },
      punctuality: {
        star: {
          type: Number,
          default: 5,
        },
        comment: {
          type: String,
          default: "",
        },
      },
      behavior: {
        star: {
          type: Number,
          default: 5,
        },
        comment: {
          type: String,
          default: "",
        },
      },
    },
  },
  { timestamps: true }
);

// Pre save middleware: Hash password
userSchema.pre("save", async function (next) {
  const user = this;

  if (user.isModified("password")) {
    const saltRounds = Number(process.env.bcrypt_salt_round) || 10;
    user.password = await bcrypt.hash(user.password, saltRounds);
  }

  next();
});

userSchema.statics.isUserExistsByEmail = async function (email) {
  return await User.findOne({ email }).select("+password");
};

userSchema.statics.isOTPVerified = async function (id) {
  const user = await User.findById(id).select("+verificationInfo");
  return user?.verificationInfo.verified;
};

userSchema.statics.isPasswordMatched = async function (
  plainTextPassword,
  hashPassword
) {
  return await bcrypt.compare(plainTextPassword, hashPassword);
};

export const User = mongoose.model("User", userSchema);
