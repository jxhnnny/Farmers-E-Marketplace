#!/bin/bash

# Rundu Farmers Marketplace - Database Setup Script

echo "🌾 Rundu Farmers Marketplace - Database Setup"
echo "============================================="

# Check if MongoDB is running
echo "📋 Checking MongoDB connection..."
if mongo --eval "db.runCommand({ping: 1})" > /dev/null 2>&1; then
    echo "✅ MongoDB is running"
else
    echo "❌ MongoDB is not running. Please start MongoDB first."
    echo "   Windows: net start MongoDB"
    echo "   macOS: brew services start mongodb/brew/mongodb-community"
    echo "   Linux: sudo systemctl start mongod"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Initialize database
echo "🗄️ Initializing database with sample data..."
npm run init-db

echo "✅ Setup completed successfully!"
echo ""
echo "🚀 To start the server:"
echo "   npm run dev    (development with auto-reload)"
echo "   npm start      (production)"
echo ""
echo "📊 Database Collections Created:"
echo "   • users (farmers, buyers, admin)"
echo "   • products"
echo "   • orders"
echo "   • messages"
echo "   • reviews"
echo ""
echo "🔑 Default Admin Login:"
echo "   Email: admin@farmersmarket.com"
echo "   Password: admin123"
echo ""
echo "👥 All farmers and buyers use password: password123"