const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Message = require('../models/Message');

// Socket.IO middleware for authentication
const authenticateSocket = async (socket, next) => {
    try {
        const token = socket.handshake.auth.token;
        
        if (!token) {
            return next(new Error('Authentication token required'));
        }

        // Verify JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Get user details
        const user = await User.findById(decoded.id);
        if (!user) {
            return next(new Error('User not found'));
        }

        // Attach user to socket
        socket.userId = user._id.toString();
        socket.user = user;
        
        next();
    } catch (error) {
        next(new Error('Invalid authentication token'));
    }
};

// Main socket event handler
const handleSocketConnection = (io) => {
    // Use authentication middleware
    io.use(authenticateSocket);

    io.on('connection', async (socket) => {
        try {
            console.log(`User ${socket.user.fullName} connected with socket ID: ${socket.id}`);

            // Set user as online
            await socket.user.setOnline(socket.id);
            
            // Join user to their personal room
            socket.join(`user_${socket.userId}`);
            
            // Broadcast user's online status to all connected clients
            socket.broadcast.emit('user_status', {
                userId: socket.userId,
                isOnline: true,
                lastSeen: new Date()
            });

            // Handle joining a conversation room
            socket.on('join_conversation', async (data) => {
                try {
                    const { partnerId } = data;
                    
                    // Validate partner exists
                    const partner = await User.findById(partnerId);
                    if (!partner) {
                        socket.emit('error', { message: 'User not found' });
                        return;
                    }

                    // Create conversation room ID (consistent ordering)
                    const roomId = [socket.userId, partnerId].sort().join('_');
                    
                    // Join the conversation room
                    socket.join(roomId);
                    
                    console.log(`User ${socket.userId} joined conversation room: ${roomId}`);
                    
                    // Mark messages as read when joining conversation
                    await Message.markAsRead(partnerId, socket.userId);
                    
                    // Notify partner about read receipts
                    socket.to(`user_${partnerId}`).emit('messages_read', {
                        readBy: socket.userId,
                        conversationId: roomId
                    });

                } catch (error) {
                    console.error('Error joining conversation:', error);
                    socket.emit('error', { message: 'Failed to join conversation' });
                }
            });

            // Handle leaving a conversation room
            socket.on('leave_conversation', (data) => {
                try {
                    const { partnerId } = data;
                    const roomId = [socket.userId, partnerId].sort().join('_');
                    
                    socket.leave(roomId);
                    console.log(`User ${socket.userId} left conversation room: ${roomId}`);
                } catch (error) {
                    console.error('Error leaving conversation:', error);
                }
            });

            // Handle sending messages
            socket.on('send_message', async (data) => {
                try {
                    const { recipientId, content, messageType = 'text' } = data;

                    // Validation
                    if (!recipientId || !content || content.trim().length === 0) {
                        socket.emit('error', { message: 'Invalid message data' });
                        return;
                    }

                    if (content.length > 1000) {
                        socket.emit('error', { message: 'Message too long' });
                        return;
                    }

                    // Check if recipient exists
                    const recipient = await User.findById(recipientId);
                    if (!recipient) {
                        socket.emit('error', { message: 'Recipient not found' });
                        return;
                    }

                    // Check if recipient can receive messages
                    if (!recipient.canReceiveMessageFrom(socket.user.userType)) {
                        socket.emit('error', { message: 'Cannot send message to this user' });
                        return;
                    }

                    // Create message
                    const message = new Message({
                        sender: socket.userId,
                        recipient: recipientId,
                        content: content.trim(),
                        messageType,
                        status: 'sent'
                    });

                    await message.save();

                    // Populate message with user details
                    await message.populate('sender', 'fullName email userType profileImage');
                    await message.populate('recipient', 'fullName email userType profileImage');

                    // Create conversation room ID
                    const roomId = [socket.userId, recipientId].sort().join('_');

                    // Send message to conversation room
                    io.to(roomId).emit('new_message', {
                        message,
                        conversationId: roomId
                    });

                    // Send notification to recipient if they're online but not in conversation
                    const recipientSocket = [...io.sockets.sockets.values()]
                        .find(s => s.userId === recipientId);
                    
                    if (recipientSocket && !recipientSocket.rooms.has(roomId)) {
                        recipientSocket.emit('message_notification', {
                            sender: {
                                _id: socket.user._id,
                                fullName: socket.user.fullName,
                                userType: socket.user.userType,
                                profileImage: socket.user.profileImage
                            },
                            messagePreview: content.substring(0, 50) + (content.length > 50 ? '...' : ''),
                            timestamp: message.createdAt
                        });
                    }

                    // Update message status to delivered if recipient is online
                    if (recipientSocket) {
                        message.status = 'delivered';
                        await message.save();
                        
                        socket.emit('message_status', {
                            messageId: message._id,
                            status: 'delivered'
                        });
                    }

                    console.log(`Message sent from ${socket.userId} to ${recipientId}`);

                } catch (error) {
                    console.error('Error sending message:', error);
                    socket.emit('error', { message: 'Failed to send message' });
                }
            });

            // Handle typing indicators
            socket.on('typing_start', (data) => {
                try {
                    const { partnerId } = data;
                    const roomId = [socket.userId, partnerId].sort().join('_');
                    
                    socket.to(roomId).emit('user_typing', {
                        userId: socket.userId,
                        userFullName: socket.user.fullName,
                        isTyping: true
                    });
                } catch (error) {
                    console.error('Error handling typing start:', error);
                }
            });

            socket.on('typing_stop', (data) => {
                try {
                    const { partnerId } = data;
                    const roomId = [socket.userId, partnerId].sort().join('_');
                    
                    socket.to(roomId).emit('user_typing', {
                        userId: socket.userId,
                        userFullName: socket.user.fullName,
                        isTyping: false
                    });
                } catch (error) {
                    console.error('Error handling typing stop:', error);
                }
            });

            // Handle message read receipts
            socket.on('mark_message_read', async (data) => {
                try {
                    const { messageId } = data;
                    
                    const message = await Message.findById(messageId);
                    if (!message || message.recipient.toString() !== socket.userId) {
                        return;
                    }

                    await message.markAsRead();
                    
                    // Notify sender about read receipt
                    const roomId = [socket.userId, message.sender.toString()].sort().join('_');
                    socket.to(roomId).emit('message_read', {
                        messageId: message._id,
                        readBy: socket.userId,
                        readAt: message.readAt
                    });

                } catch (error) {
                    console.error('Error marking message as read:', error);
                }
            });

            // Handle user going offline/disconnecting
            socket.on('disconnect', async () => {
                try {
                    console.log(`User ${socket.user.fullName} disconnected`);
                    
                    // Set user as offline
                    await socket.user.setOffline();
                    
                    // Broadcast user's offline status
                    socket.broadcast.emit('user_status', {
                        userId: socket.userId,
                        isOnline: false,
                        lastSeen: new Date()
                    });

                } catch (error) {
                    console.error('Error handling disconnect:', error);
                }
            });

            // Handle ping for keeping connection alive
            socket.on('ping', () => {
                socket.emit('pong');
            });

            // Update user's last seen periodically
            const heartbeat = setInterval(async () => {
                try {
                    if (socket.connected) {
                        await socket.user.updateLastSeen();
                    } else {
                        clearInterval(heartbeat);
                    }
                } catch (error) {
                    clearInterval(heartbeat);
                }
            }, 30000); // Update every 30 seconds

        } catch (error) {
            console.error('Error in socket connection handler:', error);
            socket.disconnect();
        }
    });
};

module.exports = { handleSocketConnection };