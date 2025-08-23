import express from "express";

import authRoute from "../route/auth.route.js";
import userRoute from "../route/user.route.js";
import categoryRoute from "../route/category.route.js";
import musicRoute from "../route/music.controller.js";
import sleepGoalRoute from "../route/sleepGoal.route.js";
import settingsRoute from "../route/settings.route.js";

const router = express.Router();

// Mounting the routes
router.use("/auth", authRoute);
router.use("/user", userRoute);
router.use("/category", categoryRoute);
router.use("/music", musicRoute);
router.use("/sleep", sleepGoalRoute);
router.use("/settings", settingsRoute);

export default router;
