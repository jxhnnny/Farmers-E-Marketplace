const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO with CORS
const io = new Server(server, {
    cors: {
        origin: [
            'http://localhost:3001',
            'http://127.0.0.1:5500',
            'http://127.0.0.1:5501',
            'http://localhost:5500',
            'http://localhost:5501',
            process.env.CLIENT_URL || 'http://localhost:3000'
        ],
        methods: ['GET', 'POST'],
        credentials: true
    }
});

// Import routes
const authRoutes = require('./routes/authRoutes');
const cropRoutes = require('./routes/cropRoutes');
const adminRoutes = require('./routes/adminRoutes');
const chatRoutes = require('./routes/chatRoutes');

// Import socket handlers
const { handleSocketConnection } = require('./socket/chatSocket');

// Middleware
app.use(cors({
    origin: [
        'http://localhost:3001',
        'http://127.0.0.1:5500',
        'http://127.0.0.1:5501',
        'http://localhost:5500',
        'http://localhost:5501',
        process.env.CLIENT_URL || 'http://localhost:3000'
    ],
    credentials: true
}));

// Disable CSP in development mode
if (process.env.NODE_ENV === 'development') {
    app.use((req, res, next) => {
        res.removeHeader('Content-Security-Policy');
        res.removeHeader('X-Content-Security-Policy');
        res.removeHeader('X-WebKit-CSP');
        next();
    });
}

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files from root directory (for index.html)
app.use(express.static(path.join(__dirname, '..')));

// Serve static files from public directory
app.use('/public', express.static(path.join(__dirname, '../public')));

// Serve uploaded images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/farmers-marketplace', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => {
    console.log('✅ Connected to MongoDB');
})
.catch((error) => {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/crops', cropRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/chat', chatRoutes);

// Initialize Socket.IO chat functionality
handleSocketConnection(io);

// Serve frontend pages
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../index.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/admin-panel.html'));
});

app.get('/marketplace', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/marketplace.html'));
});

// Import authentication middleware
const { optionalAuth } = require('./middleware/auth');
const { requireFarmer, requireBuyer, authenticateToken } = require('./middleware/auth');

// Portal routes - authentication handled client-side
app.get('/farmer-portal', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/farmer-portal.html'));
});

app.get('/buyer-portal', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/buyer-portal.html'));
});

app.get('/chat', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/chat.html'));
});

// Role validation endpoint for frontend
app.get('/api/auth/check-role/:requiredRole', authenticateToken, (req, res) => {
    const { requiredRole } = req.params;
    const userRole = req.user.userType;
    
    if (userRole === requiredRole || userRole === 'admin') {
        return res.json({
            success: true,
            hasAccess: true,
            userRole: userRole
        });
    }
    
    return res.status(403).json({
        success: false,
        hasAccess: false,
        userRole: userRole,
        message: `Access denied. ${requiredRole.charAt(0).toUpperCase() + requiredRole.slice(1)} role required.`
    });
});

// Catch-all handler for frontend routing
app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ message: 'API endpoint not found' });
    }
    res.sendFile(path.join(__dirname, '../index.html'));
});

// Global error handler
app.use((error, req, res, next) => {
    console.error('Error:', error);
    
    const status = error.statusCode || 500;
    const message = error.message || 'Internal server error';
    const data = error.data;
    
    res.status(status).json({
        message: message,
        data: data,
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
});

// Handle 404 for API routes
app.use('/api/*', (req, res) => {
    res.status(404).json({ message: 'API endpoint not found' });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
    console.log(`🚀 Farmers Marketplace server running on port ${PORT}`);
    console.log(`📱 Frontend: http://localhost:${PORT}`);
    console.log(`🔧 API: http://localhost:${PORT}/api`);
    console.log(`💬 Chat: WebSocket connection available`);
    console.log(`👨‍💼 Admin: http://localhost:${PORT}/admin`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
        console.log('HTTP server closed');
        mongoose.connection.close(false, () => {
            console.log('MongoDB connection closed');
            process.exit(0);
        });
    });
});

module.exports = app;