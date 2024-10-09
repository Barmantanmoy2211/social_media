import express from 'express';

import {Conversation} from "../models/conversation.model.js";
import {Message} from "../models/message.model.js";

export const sendMessage = async (req, res) => {
    try {
        const senderId = req.id;
        const receiverId = req.params.id;
        const message = req.body.message;

        let conversation = await Conversation.findOne({
            participants: {$all: [senderId, receiverId]}
        });

        //estaablished the conversion if not started yet
        if (!conversation) {
            conversation = await Conversation.create({
                participants: [senderId, receiverId]
            });
        };
        const newMessage = await Message.create({
            senderId,
            receiverId,
            message
        });
        if(newMessage) conversation.messages.push(newMessage._id);

        await Promise.all([
            conversation.save(),
            newMessage.save()
        ]);

        //implement socket io for real time data transfer

        return res.status(201).json({
            success: true,
            message: newMessage
        })
    } catch (error) {
        console.log(error);
    }
}