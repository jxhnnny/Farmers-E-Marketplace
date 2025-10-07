require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const { fetch } = require('undici');

// Middleware and controllers
const { auth: authenticateUser } = require('./middleware/auth');
const messageController = require('./controllers/messageController');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/farmers_marketplace';

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB:', MONGODB_URI))
  .catch(err => {
    console.error('MongoDB connection failed:', err);
    process.exit(1);
  });

app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] }));
app.use(express.json());

// Serve static frontend from repository root so /index.html etc. are accessible via the same origin
const publicRoot = path.resolve(__dirname, '..');
app.use(express.static(publicRoot));

// API routes
app.use('/api/auth', require('./routes/auth'));

// Create HTTP server and Socket.IO
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

// Expose io to route handlers/controllers
app.set('io', io);

// Socket.IO connection handling
io.on('connection', (socket) => {
    // Prefer auth payload, fallback to query
    const userId = socket.handshake.auth?.userId || socket.handshake.query?.userId;
    if (userId) {
        socket.join(String(userId));
    }

    socket.on('disconnect', () => {
        // Handle disconnect if needed
    });
});

// Chatbot endpoint using OpenAI Chat Completions API
app.post('/api/chatbot', async (req, res) => {
    try {
        if (!process.env.OPENAI_API_KEY) {
            return res.status(500).json({ error: 'Missing OPENAI_API_KEY' });
        }

        const model = req.body?.model || 'gpt-4o-mini';
        const userMessage = req.body?.message;
        const messages = req.body?.messages;

        const payload = {
            model,
            messages: messages && Array.isArray(messages)
                ? messages
                : [
                        { role: 'system', content: 'You are a helpful assistant for the Rundu Farmers Marketplace. Be concise and useful.' },
                        { role: 'user', content: String(userMessage || '') }
                    ]
        };

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        if (!response.ok) {
            return res.status(response.status).json({ error: data?.error || 'OpenAI error' });
        }
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Chatbot service unavailable' });
    }
});

// Real-time messaging endpoints
app.post('/api/messages', authenticateUser, messageController.sendMessage);
app.get('/api/messages/conversation/:userId', authenticateUser, messageController.getConversation);
app.get('/api/messages', authenticateUser, messageController.getConversations);

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// Export for tests if needed
module.exports = { app, server, io };