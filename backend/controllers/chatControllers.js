const asyncHandler = require("express-async-handler");
const Chat = require("../models/chatModels");
const User = require("../models/userModel");

const accessChat = asyncHandler(async (req, res) => {
    const { userId } = req.body;

    if (!userId) {
        console.log("UserId param not sent with request");
        return res.sendStatus(400);
    }

    var isChat = await Chat.find({
        isGroupChat: false,
        $and: [
            { users: { $elemMatch: { $eq: req.user._id } } },
            { users: { $elemMatch: { $eq: userId } } }
        ]
    })
        .populate("users", "-password")
        .populate("latestMessage");

        isChat = await User.populate(isChat,{
            path: "latestMessage.sender",
            select: "name email"
        });

        if(isChat.length > 0) {
            res.send(isChat[0]);
        } else {
            var chatData = {
                chatName: "sender",
                isGroupChat: false,
                users: [req.user._id, userId],
            };

            try {
                const createdChat = await Chat.create(chatData);

                const FullChat = await Chat.findOne({_id: createdChat.id}).populate("users", "-password");

                res.status(200).send(FullChat);
            } catch (error) {
                res.status(400);
                throw new Error(error.message);
            }
        }
});

const fetchChats = asyncHandler(async (req, res) => {
    try {
        // Fetch chats with populated fields
        let chats = await Chat.find({ users: { $eq: req.user._id } })
            .populate("users", "-password")
            .populate("groupAdmin", "-password")
            .populate("latestMessage")
            .sort({ updatedAt: -1 });

        // Populate the latestMessage sender field with selected fields
        chats = await User.populate(chats, {
            path: "latestMessage.sender",
            select: "name email",
        });

        // Send the result with status 200 (success)
        res.status(200).send(chats);
    } catch (error) {
        // Send status 400 (bad request) with an error message
        res.status(400).send({ message: error.message });
    }
});

const createGroupChat = asyncHandler(async (req, res) => {
    if (!req.body.users || !req.body.name){
        return res.status(400).send({ message: "Please Fill all the feilds" });
    }

    var users = JSON.parse(req.body.users);

    if (users.length < 2) {
        return res.status(400).send("Please add at least 2 users")
    }

    users.push(req.user);

    try {
        const groupChat = await Chat.create({
            chatName: req.body.name,
            users: users,
            isGroupChat: true,
            groupAdmin: req.user,
            });

            const fullGroupChat = await Chat.findOne({ _id: groupChat._id }).populate("users", "-password").populate("groupAdmin", "-password")

            res.status(200).json(fullGroupChat);

    } catch (error) {
        res.statusMessage(400);
        throw new Error(error.message);
    }
});

const renameGroup = asyncHandler(async (req, res) => {
    const { chatId, chatName } = req.body;

    const updatedChat = await Chat.findByIdAndUpdate(
        chatId,
        {
            chatName
        },{
            new: true,
        }
    ).populate("users", "-password").populate("groupAdmin", "-password");

    if (!updatedChat) {
        res.status(404);
        throw new Error(error.message);
    } else{
        res.json(updatedChat);
    }
});

const addToGroup = asyncHandler(async (req, res) => {
    const { chatId, userId } = req.body;

    const added = await Chat.findByIdAndUpdate(chatId,
        {
            $push: {users: userId },
        },
        {
            new: true,
        }
).populate("users", "-password").populate("groupAdmin", "-password");


    if (!added) {
        res.status(404);
        send("Chat or user not found");
    } else{
        res.json(added);
    }
});

const removeFromGroup = asyncHandler(async (req, res) =>{
    const { chatId, userId } = req.body;

    const removed = await Chat.findByIdAndUpdate(chatId,
        {
            $pull: {users: userId },
        },
        {
            new: true,
        }
).populate("users", "-password").populate("groupAdmin", "-password");


    if (!removed) {
        res.status(404);
        send("Chat or user not found");
    } else{
        res.json(removed);
    }
});

module.exports = {accessChat, fetchChats, createGroupChat, renameGroup, addToGroup, removeFromGroup}