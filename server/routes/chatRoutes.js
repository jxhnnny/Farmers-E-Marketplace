const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ 
            success: false, 
            message: 'Access token required' 
        });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ 
                success: false, 
                message: 'Invalid or expired token' 
            });
        }
        req.user = user;
        next();
    });
};

/**
 * @route   GET /api/chat/conversations
 * @desc    Get user's recent conversations
 * @access  Private
 */
router.get('/conversations', authenticateToken, async (req, res) => {
    try {
        const conversations = await Message.getRecentConversations(req.user.id);
        
        res.json({
            success: true,
            data: {
                conversations,
                total: conversations.length
            }
        });
    } catch (error) {
        console.error('Error fetching conversations:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch conversations',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * @route   GET /api/chat/messages/:partnerId
 * @desc    Get conversation messages with a specific user
 * @access  Private
 */
router.get('/messages/:partnerId', authenticateToken, async (req, res) => {
    try {
        const { partnerId } = req.params;
        const { page = 1, limit = 50 } = req.query;

        // Validate partner exists
        const partner = await User.findById(partnerId);
        if (!partner) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Get messages between current user and partner
        const messages = await Message.getConversation(
            req.user.id, 
            partnerId, 
            parseInt(limit), 
            parseInt(page)
        );

        // Mark messages as read
        await Message.markAsRead(partnerId, req.user.id);

        res.json({
            success: true,
            data: {
                messages: messages.reverse(), // Reverse to show oldest first
                partner: {
                    _id: partner._id,
                    fullName: partner.fullName,
                    userType: partner.userType,
                    profileImage: partner.profileImage,
                    isOnline: partner.isOnline,
                    lastSeen: partner.lastSeen
                },
                pagination: {
                    currentPage: parseInt(page),
                    limit: parseInt(limit),
                    hasMore: messages.length === parseInt(limit)
                }
            }
        });
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch messages',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * @route   POST /api/chat/send
 * @desc    Send a message to another user
 * @access  Private
 */
router.post('/send', authenticateToken, async (req, res) => {
    try {
        const { recipientId, content, messageType = 'text' } = req.body;

        // Validation
        if (!recipientId || !content) {
            return res.status(400).json({
                success: false,
                message: 'Recipient ID and message content are required'
            });
        }

        if (content.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Message content cannot be empty'
            });
        }

        if (content.length > 1000) {
            return res.status(400).json({
                success: false,
                message: 'Message content too long (max 1000 characters)'
            });
        }

        // Validate recipient exists
        const recipient = await User.findById(recipientId);
        if (!recipient) {
            return res.status(404).json({
                success: false,
                message: 'Recipient not found'
            });
        }

        // Check if sender is trying to message themselves
        if (req.user.id === recipientId) {
            return res.status(400).json({
                success: false,
                message: 'Cannot send message to yourself'
            });
        }

        // Get sender details
        const sender = await User.findById(req.user.id);

        // Check if recipient can receive messages from sender
        if (!recipient.canReceiveMessageFrom(sender.userType)) {
            return res.status(403).json({
                success: false,
                message: 'Recipient has restricted message settings'
            });
        }

        // Create and save message
        const message = new Message({
            sender: req.user.id,
            recipient: recipientId,
            content: content.trim(),
            messageType,
            status: 'sent'
        });

        await message.save();

        // Populate sender and recipient details
        await message.populate('sender', 'fullName email userType profileImage');
        await message.populate('recipient', 'fullName email userType profileImage');

        res.status(201).json({
            success: true,
            data: {
                message
            }
        });

        // Note: Socket.IO emission will be handled in the socket events
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send message',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * @route   PUT /api/chat/messages/:messageId/read
 * @desc    Mark a message as read
 * @access  Private
 */
router.put('/messages/:messageId/read', authenticateToken, async (req, res) => {
    try {
        const { messageId } = req.params;

        const message = await Message.findById(messageId);
        if (!message) {
            return res.status(404).json({
                success: false,
                message: 'Message not found'
            });
        }

        // Only recipient can mark message as read
        if (message.recipient.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized to mark this message as read'
            });
        }

        if (!message.isRead) {
            await message.markAsRead();
        }

        res.json({
            success: true,
            data: {
                message
            }
        });
    } catch (error) {
        console.error('Error marking message as read:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to mark message as read',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * @route   GET /api/chat/users
 * @desc    Get list of users available for chat (excluding current user)
 * @access  Private
 */
router.get('/users', authenticateToken, async (req, res) => {
    try {
        const { search, userType, page = 1, limit = 20 } = req.query;
        const skip = (page - 1) * limit;

        // Build query
        const query = { 
            _id: { $ne: req.user.id }, // Exclude current user
            status: 'active' 
        };

        if (search) {
            query.$or = [
                { fullName: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        if (userType && ['farmer', 'buyer'].includes(userType)) {
            query.userType = userType;
        }

        const users = await User.find(query)
            .select('fullName email userType profileImage isOnline lastSeen region')
            .sort({ isOnline: -1, lastSeen: -1 })
            .limit(parseInt(limit))
            .skip(skip);

        const total = await User.countDocuments(query);

        res.json({
            success: true,
            data: {
                users,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(total / limit),
                    totalUsers: total,
                    hasMore: skip + users.length < total
                }
            }
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch users',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * @route   PUT /api/chat/settings
 * @desc    Update user's chat settings
 * @access  Private
 */
router.put('/settings', authenticateToken, async (req, res) => {
    try {
        const { allowMessagesFrom, messageNotifications, onlineStatus } = req.body;

        const updateData = {};
        
        if (allowMessagesFrom && ['everyone', 'farmers-only', 'buyers-only', 'contacts-only'].includes(allowMessagesFrom)) {
            updateData['chatSettings.allowMessagesFrom'] = allowMessagesFrom;
        }
        
        if (typeof messageNotifications === 'boolean') {
            updateData['chatSettings.messageNotifications'] = messageNotifications;
        }
        
        if (typeof onlineStatus === 'boolean') {
            updateData['chatSettings.onlineStatus'] = onlineStatus;
        }

        const user = await User.findByIdAndUpdate(
            req.user.id,
            { $set: updateData },
            { new: true }
        ).select('chatSettings');

        res.json({
            success: true,
            data: {
                chatSettings: user.chatSettings
            }
        });
    } catch (error) {
        console.error('Error updating chat settings:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update chat settings',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

module.exports = router;