import express from "express";
import { addToGroup, createChat, createGroupChat, getChats, getMessages, leaveGroup, removeFromGroup, sendMessage } from "../controller/chat.controller.js";

const router = express.Router();

// router.use(isAuthenticated);

router.post("/create", createChat);
// router.post("/create-group",upload.single("image"), createGroupChat);
router.post("/add-to-group", addToGroup);
router.post("/remove-from-group", removeFromGroup);
router.post("/leave-group/:chatId", leaveGroup);
// router.post("/send-message", upload.array("files", 10), sendMessage);
router.get("/list", getChats);
router.get("/messages/:chatId", getMessages);
// router.get("/notifications", getNotifications);
// router.put("/notifications/:notificationId/read", markNotificationAsRead);

export default router;
