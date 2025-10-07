const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const auth = require('../middleware/auth');

// Send a message
router.post('/send', auth, messageController.sendMessage);

// Get conversation between two users
router.get('/conversation/:userId', auth, messageController.getConversation);

// Get all conversations for the current user
router.get('/conversations', auth, messageController.getConversations);

// Mark messages as read
router.put('/mark-read/:conversationId', auth, messageController.markAsRead);

// Get unread message count
router.get('/unread-count', auth, messageController.getUnreadCount);

module.exports = router;