// import AppError from "../errors/AppError.js";
// import { Chat } from "../model/chat.modal.js";
// import catchAsync from "../utils/catchAsync.js";
// import httpStatus from "http-status";
// import sendResponse from "../utils/sendResponse.js";
// import { io } from "../server.js";
// import { User } from "../model/user.model.js";

import mongoose from "mongoose";
import { Chat } from "../model/chat.modal.js";
import { Message } from "../model/message.model.js";
import catchAsync from "../utils/catchAsync.js";
import sendResponse from "../utils/sendResponse.js";
import AppError from "./../errors/AppError.js";

// export const createChat = catchAsync(async (req, res) => {
//     const { participents } = req.body;
//     const userId = req.user._id;
//     const user = await User.findById(userId);
//     if (!user) {
//         throw new AppError(404, "Farm not found");
//     }
//     let chat = await Chat.findOne({ farm: farmId, user: req.user.id });
//     if (!chat) {
//         chat = await Chat.create({ name: farm.name, farm: farmId, user: req.user._id });
//     }
//     sendResponse(res, {
//         statusCode: httpStatus.OK,
//         message: "Chat created successfully",
//         success: true,
//         data: chat
//     })

// })

// export const sendMessage = catchAsync(async (req, res) => {
//     const { chatId, message } = req.body;
//     const chat = await Chat.findById(chatId);
//     if (!chat) {
//         throw new AppError(404, "Chat not found");
//     }
//     if (chat.user.toString() !== req.user._id.toString() && chat?.farm?.toString() !== req.user?.farm?.toString()) {
//         throw new AppError(401, "You are not authorized to send message in this chat");
//     }
//     const messages = {
//         text: message,
//         user: req.user._id,
//         date: new Date(),
//         read: false
//     }
//     chat.messages.push(messages);
//     await chat.save();

//     const chat12 = await Chat.findOne({ _id: chatId }).select({ messages: { $slice: -1 } }) // Only include last message
//         .populate("messages.user", "name role avatar"); // Populate sender of last message

//     if(chat12.messages[0]){
//         io.to(`chat_${chatId}`).emit("newMassage", chat12.messages[0]);
//     }

//     sendResponse(res, {
//         statusCode: httpStatus.OK,
//         message: "Message sent successfully",
//         success: true,
//         data: chat
//     })

// })

// export const updateMessage = catchAsync(async (req, res) => {
//     const { chatId, messageId, newText } = req.body;

//     const chat = await Chat.findById(chatId).populate("messages.user", "name role avatar");
//     if (!chat) throw new AppError(404, "Chat not found");

//     const message = chat.messages.id(messageId);
//     if (!message) throw new AppError(404, "Message not found");

//     // Optional: check if current user is the sender
//     if (!message.user.equals(req.user._id)) {
//         throw new AppError(403, "You can only edit your own messages");
//     }

//     message.text = newText;
//     io.to(`chat_${chatId}`).emit("newMassage", message);
//     await chat.save();

//     sendResponse(res, {
//         statusCode: 200,
//         success: true,
//         message: "Message updated successfully",
//         data: message
//     });
// });

// export const deleteMessage = catchAsync(async (req, res) => {
//     const { chatId, messageId } = req.body;

//     const chat = await Chat.findById(chatId);
//     if (!chat) throw new AppError(404, "Chat not found");

//     const message = chat.messages.id(messageId);
//     if (!message) throw new AppError(404, "Message not found");

//     // Optional: check if current user is the sender
//     if (!message.user.equals(req.user._id)) {
//         throw new AppError(403, "You can only delete your own messages");
//     }

//     message.remove();
//     await chat.save();

//     sendResponse(res, {
//         statusCode: 200,
//         success: true,
//         message: "Message deleted successfully",
//     });
// });

// export const getChatForUser = catchAsync(async (req, res) => {
//     const user = req.user._id
//     const chat = await Chat.find({ user })
//         .select({ messages: { $slice: -1 } }) // Only include last message
//         .populate("messages.user", "name role avatar") // Populate sender of last message
//         .sort({ updatedAt: -1 }); // Sort by last updated time
//     sendResponse(res, {
//         statusCode: httpStatus.OK,
//         message: "Chat retrieved successfully",
//         success: true,
//         data: chat
//     })
// })

// export const getChatForFarm = catchAsync(async (req, res) => {
//     const { farmId } = req.params
//     const chat = await Chat.find({ farm: farmId }).select({ messages: { $slice: -1 } }) // Only include last message
//         .populate("messages.user", "name role avatar") // Populate sender of last message
//         .sort({ updatedAt: -1 }); // Sort by last updated time
//     sendResponse(res, {
//         statusCode: httpStatus.OK,
//         message: "Chat retrieved successfully",
//         success: true,
//         data: chat
//     })
// })

// export const getSingleChat = catchAsync(async (req, res) => {
//     const { chatId } = req.params
//     const chat = await Chat.findById(chatId).populate("messages.user", "name role avatar");
//     if (!chat) throw new AppError(404, "Chat not found");
//     sendResponse(res, {
//         statusCode: httpStatus.OK,
//         message: "Chat retrieved successfully",
//         success: true,
//         data: chat
//     })
// })

export const createChat = catchAsync(async (req, res, next) => {
  const { participantId } = req.body;
  const userId = req.user._id;
  console.log("Creating chat...", req.body);
  if (!participantId) {
    throw new AppError(400, "Participant ID is required");
  }

  if (userId === participantId) {
    throw new AppError(400, "Participants should be getter than one.");
  }

  let chat = await Chat.findOne({
    participants: { $all: [userId, participantId], $size: 2 },
    isGroupChat: false,
  })
    .populate("participants", publicUserFields)
    .populate({
      path: "lastMessage",
      populate: {
        path: "sender",
        select: publicUserFields,
      },
    });
  if (!chat) {
    chat = await Chat.create({
      participants: [userId, participantId],
      isGroupChat: false,
    });
  } else {
    console.log("Dropping creating new direct chat", chat);
  }
  chat = await Chat.findById(chat._id)
    .populate("participants", publicUserFields)
    .populate({
      path: "lastMessage",
      populate: {
        path: "sender",
        select: publicUserFields,
      },
    });
  // Title logic
  if (chat != null && !chat.isGroupChat) {
    const chatTitle = chat.participants
      .filter((p) => p._id.toString() !== userId.toString())
      .map((p) => p.name || p.phone)
      .join(", ");
    chat.title = chatTitle;
    console.log("generated title", chat.title);
  } else {
    throw new AppError(400, "Could not create chat!!");
  }

  if (chat.lastMessage) {
    const lastMessage = chat.lastMessage.toObject(); // Convert to plain object
    lastMessage.isMe = lastMessage.sender._id.toString() === userId.toString();
    chat = chat.toObject(); // Convert full chat if needed
    chat.lastMessage = lastMessage;
  }

  // Send new chat to participants through socket
  const io = getIO();
  chat.participants.forEach((participant) => {
    io.to(participant._id.toString()).emit("newChat", chat);
  });

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Chat created successfully",
    data: chat,
  });
});

export const createGroupChat = catchAsync(async (req, res, next) => {
  let { participantIds, title } = req.body;
  const adminId = req.user._id;
  console.log("Creating group chat...", req.body);
  // 🧠 Parse stringified array
  if (typeof participantIds === "string") {
    try {
      participantIds = JSON.parse(participantIds);
    } catch (error) {
      throw new AppError(400, "Invalid participantIds format");
    }
  }

  if (!Array.isArray(participantIds) || participantIds.length < 1) {
    throw new AppError(400, "Members list can not be empty!!");
  }
  if (!title) {
    throw new AppError(400, "Group name is required");
  }
  // If avatar file is uploaded, process it

  let imageUrl = [];
  if (req.file) {
    const fileType = req.file.mimetype.split("/")[0];
    const uploadOptions = {
      resource_type: ["image"].includes(fileType) ? fileType : "auto",
    };
    const result = await uploadOnCloudinary(req.file.buffer, uploadOptions);
    imageUrl.url = result.secure_url;
    imageUrl.name = req.file.Originalname;
  }
  participantIds.push(adminId.toString());
  // array -> set -> array
  const participants = Array.from(new Set(participantIds));
  // No duplicates of user ids in paticipents array
  console.log("participants..", participants);
  let chat = await Chat.create({
    participants,
    isGroupChat: true,
    title,
    admin: adminId,
    imageUrl,
  });

  chat = await Chat.findOne(chat._id)
    .populate("participants", publicUserFields)
    .populate({
      path: "lastMessage",
      populate: {
        path: "sender",
        select: publicUserFields,
      },
    });

  // Send new group chat to participants through socket
  const io = getIO();
  participants.forEach((participant) => {
    io.to(participant.toString()).emit("newChat", chat);
  });

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Group chat created successfully",
    data: chat,
  });
});

export const updateGroupChat = catchAsync(async (req, res, next) => {
  const { chatId } = req.params;
  const { title } = req.body;
  const userId = req.user._id;

  const chat = await Chat.findById(chatId);
  if (!chat || !chat.isGroupChat) {
    throw new AppError(404, "Group chat not found");
  }

  if (chat.admin.toString() !== userId.toString()) {
    throw new AppError(403, "Only admin can update the group chat");
  }

  if (title) {
    chat.title = title;
  }

  if (req.file) {
    const fileType = req.file.mimetype.split("/")[0];
    const uploadOptions = {
      resource_type: ["image"].includes(fileType) ? fileType : "auto",
    };
    const result = await uploadOnCloudinary(req.file.buffer, uploadOptions);
    chat.imageUrl = {
      url: result.secure_url,
      name: req.file.originalname,
    };
  }

  await chat.save();

  const io = getIO();
  chat.participants.forEach((participant) => {
    io.to(participant.toString()).emit("groupChatUpdated", chat);
  });

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Group chat updated successfully",
    data: chat,
  });
});

export const addToGroup = catchAsync(async (req, res, next) => {
  const { chatId, userId } = req.body;

  if (!chatId || !userId) {
    throw new AppError(400, "Chat ID and user ID are required");
  }

  const chat = await Chat.findById(chatId);
  if (!chat || !chat.isGroupChat) {
    throw new AppError(404, "Group chat not found");
  }
  if (chat.participants.includes(userId)) {
    throw new AppError(400, "User already in group");
  }

  chat.participants.push(userId);
  await chat.save();

  // Notify all group participants about the new member via socket
  const io = getIO();
  chat.participants.forEach((participant) => {
    io.to(participant.toString()).emit("groupUserAdded", {
      chatId: chat._id,
      userId,
    });
  });

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "User added to group successfully",
    data: chat,
  });
});

export const removeFromGroup = catchAsync(async (req, res, next) => {
  const { chatId, userId } = req.body;

  if (!chatId || !userId) {
    throw new AppError(400, "Chat ID and user ID are required");
  }

  const chat = await Chat.findById(chatId);
  if (!chat || !chat.isGroupChat) {
    throw new AppError(404, "Group chat not found");
  }
  if (!chat.participants.includes(userId)) {
    throw new AppError(400, "User not in group");
  }

  chat.participants = chat.participants.filter(
    (id) => id.toString() !== userId
  );
  await chat.save();

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "User removed from group successfully",
    data: chat,
  });
});

export const leaveGroup = catchAsync(async (req, res, next) => {
  const { chatId } = req.params;
  const userId = req.user._id;

  if (!chatId) {
    throw new AppError(400, "Chat ID is required");
  }

  const chat = await Chat.findById(chatId);

  if (!chat || !chat.isGroupChat) {
    throw new AppError(404, "Group chat not found");
  }

  if (!chat.participants.includes(userId)) {
    throw new AppError(400, "You are not a participant of this group");
  }

  if (chat.admin.toString() === userId.toString()) {
    throw new AppError(400, "Admin cannot leave the group");
  }

  chat.participants = chat.participants.filter(
    (id) => id.toString() !== userId.toString()
  );

  await chat.save();

  const io = getIO();
  io.to(chatId).emit("userLeft", {
    userId,
    message: "User has left the group",
  });

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "You have left the group successfully",
    data: chat,
  });
});

export const sendMessage = catchAsync(async (req, res, next) => {
  let { chatId, content, contentType, participantId } = req.body;
  const sender = req.user._id;
  console.log(req.body);
  if (!chatId || (!content && !req.files?.length)) {
    throw new AppError(400, "Chat ID and content or files are required");
  }
  // ----- No more need this logic for creating chat if not exists -----
  // ----- Should be removed by the backend devs -----

  // if (!chatId) {
  //   if (participantId) {
  //     const chat = await Chat.findOne({
  //       participants: { $all: [sender, participantId], $size: 2 },
  //       isGroupChat: false,
  //     });
  //     if (chat) {
  //       chatId = chat._id;
  //     } else {
  //       const chat = await Chat.create({
  //         participants: [sender, participantId],
  //         isGroupChat: false,
  //       });
  //       chatId = chat._id;
  //     }
  //   }
  // }

  const chat = await Chat.findById(chatId).populate("participants", "name");
  if (!chat) {
    throw new AppError(404, "Chat not found");
  }

  let fileUrls = [];

  if (req.files && req.files.length > 0) {
    const uploadPromises = req.files.map(async (file) => {
      const fileType = contentType || "file";
      const uploadOptions = {
        resource_type: ["image", "video", "audio"].includes(fileType)
          ? fileType
          : "auto",
      };
      const result = await uploadOnCloudinary(file.buffer, uploadOptions);
      return {
        url: result.secure_url,
        content: result.resource_type,
        name: file.originalname,
      };
    });
    fileUrls = await Promise.all(uploadPromises);
  }

  const senderUser = await User.findById(sender);
  const contactsToAdd = chat.participants.filter(
    (p) =>
      p._id.toString() !== sender.toString() &&
      !senderUser.contacts.map((id) => id.toString()).includes(p._id.toString())
  );

  if (contactsToAdd.length > 0) {
    senderUser.contacts.push(...contactsToAdd.map((p) => p._id));
    await senderUser.save();
  }

  const message = await Message.create({
    chatId,
    sender,
    content: content,
    contentType: contentType || "text",
    fileUrl: fileUrls.length > 0 ? fileUrls : undefined,
  });

  chat.lastMessage = message._id;
  await chat.save();

  const notificationContent = chat.isGroupChat
    ? `${senderUser.name} sent a message in ${chat.title}`
    : `${senderUser.name} sent you a message`;

  const recipients = chat.participants;

  const fullMessageDoc = await Message.findById(message._id).populate(
    "sender",
    publicUserFields
  );

  const fullMessage = {
    ...fullMessageDoc.toObject(),
  };
  const io = getIO();
  const notifications = recipients.map(async (recipient) => {
    const notification = await Notification.create({
      userId: recipient._id,
      chatId,
      messageId: message._id,
      content: notificationContent,
    });

    // Notify recipents
    io.to(recipient._id.toString()).emit("newNotification", notification);
    io.to(recipient._id.toString()).emit("newMessage", {
      ...fullMessage,
      isMe: fullMessageDoc.sender._id.toString() === recipient._id.toString(),
    });
  });

  await Promise.all(notifications);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Message sent successfully",
    data: fullMessage,
  });
});

export const getChats = catchAsync(async (req, res, next) => {
  const userId = req.user._id;

  const chats = await Chat.find({
    participants: userId,
  })
    .populate("participants", "name phone image")
    .populate({
      path: "lastMessage",
      populate: {
        path: "sender",
        select: publicUserFields,
      },
    });
  console.log("Chats found", chats.length);
  const activeChats = [];
  const nonActiveChats = [];

  for (const chat of chats) {
    // Title logic
    if (!chat.isGroupChat) {
      const chatTitle = chat.participants
        .filter((p) => p._id.toString() !== userId.toString())
        .map((p) => p.name || p.phone)
        .join(", ");
      chat.title = chatTitle;
    }

    // Check if the chat has any message
    const hasMessage = await Message.exists({ chatId: chat._id });

    if (hasMessage) {
      // Optionally populate the latest message here
      const lastMessage = await Message.findOne({ chatId: chat._id })
        .sort({ createdAt: -1 })
        .populate("sender", publicUserFields)
        .lean();
      // ------------- chat lasMessage.isMe value logic ----------
      if (lastMessage) {
        lastMessage.isMe =
          lastMessage.sender._id.toString() === userId.toString();
        chat.lastMessage = lastMessage;
      }

      activeChats.push(chat);
    } else {
      nonActiveChats.push(chat);
    }
    if (!hasMessage && chat.isGroupChat) {
      activeChats.push(chat);
    }
  }

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Chats retrieved successfully",
    data: { activeChats, nonActiveChats },
  });
});

export const getMessages = catchAsync(async (req, res, next) => {
  const { chatId } = req.params;
  const { limit = 30, before } = req.query;

  const query = { chatId };

  if (before) {
    if (mongoose.Types.ObjectId.isValid(before)) {
      query._id = { $lt: before };
    } else if (!isNaN(Date.parse(before))) {
      query.createdAt = { $lt: new Date(before) };
    } else {
      throw new AppError(400, "Invalid 'before' parameter");
    }
  }

  let messages = await Message.find(query)
    .sort({ createdAt: -1 })
    .limit(Number(limit))
    .populate("sender", publicUserFields);

  const currentUserId = req.user._id.toString(); // or wherever you're getting the user ID from

  const updatedMessages = messages.map((msg) => {
    return {
      ...msg.toObject(),
      isMe: msg.sender._id.toString() === currentUserId,
    };
  });

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Messages retrieved successfully",
    data: updatedMessages,
  });
});

// export const getNotifications = catchAsync(async (req, res, next) => {
//   const userId = req.user._id;

//   const notifications = await Notification.find({ userId })
//     .populate("chatId", "title participants")
//     .populate("messageId", "content")
//     .sort({ createdAt: -1 });

//   sendResponse(res, {
//     statusCode: 200,
//     success: true,
//     message: "Notifications retrieved successfully",
//     data: notifications,
//   });
// });

// export const markNotificationAsRead = catchAsync(async (req, res, next) => {
//   const { notificationId } = req.params;

//   const notification = await Notification.findById(notificationId);
//   if (!notification) {
//     throw new AppError(404, "Notification not found");
//   }

//   notification.isRead = true;
//   await notification.save();

//   sendResponse(res, {
//     statusCode: 200,
//     success: true,
//     message: "Notification marked as read",
//     data: notification,
//   });
// });
