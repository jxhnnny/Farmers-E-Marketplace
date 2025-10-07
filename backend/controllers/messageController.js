const mongoose = require('mongoose');
const Message = require('../models/Message');
const User = require('../models/User');

exports.sendMessage = async (req, res) => {
  try {
    const { receiverId, content, messageType = 'text', attachment, orderRef } = req.body;

    // Check if receiver exists
    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({
        success: false,
        message: 'Receiver not found'
      });
    }

    const message = await Message.create({
      sender: req.user.userId,
      receiver: receiverId,
      content,
      messageType,
      attachment,
      orderRef
    });

    // Populate sender/receiver info for response
    await message.populate('sender', 'name role');
    await message.populate('receiver', 'name role');

    // Emit real-time message via Socket.IO (io attached to app)
    const io = req.app.get('io');
    io.to(String(receiverId)).emit('receive_message', {
      message,
      conversationId: message.conversationId
    });

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: { message }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error sending message',
      error: error.message
    });
  }
};

exports.getConversation = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.userId;

    const participants = [currentUserId, userId].sort();
    const conversationId = participants.join('_');

    const messages = await Message.find({ conversationId })
      .populate('sender', 'name role profileImage')
      .populate('receiver', 'name role profileImage')
      .sort({ createdAt: 1 });

    // Mark messages as read
    await Message.updateMany(
      {
        conversationId,
        receiver: currentUserId,
        isRead: false
      },
      { isRead: true }
    );

    res.json({
      success: true,
      data: { messages }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching conversation',
      error: error.message
    });
  }
};

exports.getConversations = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get unique conversations for the user
    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [
            { sender: mongoose.Types.ObjectId(userId) },
            { receiver: mongoose.Types.ObjectId(userId) }
          ]
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $group: {
          _id: '$conversationId',
          lastMessage: { $first: '$$ROOT' },
          unreadCount: {
            $sum: {
              $cond: [
                { $and: [
                  { $eq: ['$receiver', mongoose.Types.ObjectId(userId)] },
                  { $eq: ['$isRead', false] }
                ]},
                1,
                0
              ]
            }
          }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'lastMessage.sender',
          foreignField: '_id',
          as: 'senderInfo'
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'lastMessage.receiver',
          foreignField: '_id',
          as: 'receiverInfo'
        }
      },
      {
        $project: {
          conversationId: '$_id',
          lastMessage: 1,
          unreadCount: 1,
          otherUser: {
            $cond: [
              { $ne: ['$lastMessage.sender', mongoose.Types.ObjectId(userId)] },
              { $arrayElemAt: ['$senderInfo', 0] },
              { $arrayElemAt: ['$receiverInfo', 0] }
            ]
          }
        }
      },
      {
        $sort: { 'lastMessage.createdAt': -1 }
      }
    ]);

    res.json({
      success: true,
      data: { conversations }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching conversations',
      error: error.message
    });
  }
};