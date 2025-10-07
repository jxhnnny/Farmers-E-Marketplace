const mongoose = require('mongoose');

// Message Schema for chat functionality
const messageSchema = new mongoose.Schema({
    // Sender of the message
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    
    // Recipient of the message
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    
    // Message content
    content: {
        type: String,
        required: true,
        trim: true,
        maxlength: 1000
    },
    
    // Message type (text, image, etc. - for future expansion)
    messageType: {
        type: String,
        enum: ['text', 'image', 'file'],
        default: 'text'
    },
    
    // Read status
    isRead: {
        type: Boolean,
        default: false
    },
    
    // Timestamp when message was read
    readAt: {
        type: Date
    },
    
    // Message status
    status: {
        type: String,
        enum: ['sent', 'delivered', 'read'],
        default: 'sent'
    }
}, {
    timestamps: true // Automatically adds createdAt and updatedAt fields
});

// Index for efficient querying
messageSchema.index({ sender: 1, recipient: 1, createdAt: -1 });
messageSchema.index({ recipient: 1, isRead: 1 });

// Virtual for getting conversation participants
messageSchema.virtual('participants').get(function() {
    return [this.sender, this.recipient];
});

// Static method to get conversation between two users
messageSchema.statics.getConversation = function(userId1, userId2, limit = 50, page = 1) {
    const skip = (page - 1) * limit;
    
    return this.find({
        $or: [
            { sender: userId1, recipient: userId2 },
            { sender: userId2, recipient: userId1 }
        ]
    })
    .populate('sender', 'fullName email userType profilePicture')
    .populate('recipient', 'fullName email userType profilePicture')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);
};

// Static method to get user's recent conversations
messageSchema.statics.getRecentConversations = function(userId, limit = 20) {
    return this.aggregate([
        // Match messages where user is sender or recipient
        {
            $match: {
                $or: [
                    { sender: mongoose.Types.ObjectId(userId) },
                    { recipient: mongoose.Types.ObjectId(userId) }
                ]
            }
        },
        
        // Sort by creation date (newest first)
        { $sort: { createdAt: -1 } },
        
        // Group by conversation partner
        {
            $group: {
                _id: {
                    $cond: {
                        if: { $eq: ['$sender', mongoose.Types.ObjectId(userId)] },
                        then: '$recipient',
                        else: '$sender'
                    }
                },
                lastMessage: { $first: '$$ROOT' },
                unreadCount: {
                    $sum: {
                        $cond: {
                            if: {
                                $and: [
                                    { $eq: ['$recipient', mongoose.Types.ObjectId(userId)] },
                                    { $eq: ['$isRead', false] }
                                ]
                            },
                            then: 1,
                            else: 0
                        }
                    }
                }
            }
        },
        
        // Sort by last message date
        { $sort: { 'lastMessage.createdAt': -1 } },
        
        // Limit results
        { $limit: limit },
        
        // Populate user details
        {
            $lookup: {
                from: 'users',
                localField: '_id',
                foreignField: '_id',
                as: 'partner'
            }
        },
        
        // Unwind partner array
        { $unwind: '$partner' },
        
        // Project final structure
        {
            $project: {
                partner: {
                    _id: '$partner._id',
                    fullName: '$partner.fullName',
                    email: '$partner.email',
                    userType: '$partner.userType',
                    profilePicture: '$partner.profilePicture',
                    lastSeen: '$partner.lastSeen',
                    isOnline: '$partner.isOnline'
                },
                lastMessage: '$lastMessage',
                unreadCount: '$unreadCount'
            }
        }
    ]);
};

// Static method to mark messages as read
messageSchema.statics.markAsRead = function(senderId, recipientId) {
    return this.updateMany(
        {
            sender: senderId,
            recipient: recipientId,
            isRead: false
        },
        {
            $set: {
                isRead: true,
                readAt: new Date(),
                status: 'read'
            }
        }
    );
};

// Instance method to mark single message as read
messageSchema.methods.markAsRead = function() {
    this.isRead = true;
    this.readAt = new Date();
    this.status = 'read';
    return this.save();
};

module.exports = mongoose.model('Message', messageSchema);