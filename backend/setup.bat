@echo off
echo 🌾 Rundu Farmers Marketplace - Database Setup
echo =============================================

echo 📋 Checking if Node.js is installed...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js first.
    pause
    exit /b 1
)

echo ✅ Node.js is installed

echo 📦 Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)

echo 🗄️ Initializing database with sample data...
call npm run init-db
if %errorlevel% neq 0 (
    echo ❌ Failed to initialize database
    pause
    exit /b 1
)

echo.
echo ✅ Setup completed successfully!
echo.
echo 🚀 To start the server:
echo    npm run dev    (development with auto-reload)
echo    npm start      (production)
echo.
echo 📊 Database Collections Created:
echo    • users (farmers, buyers, admin)
echo    • products
echo    • orders
echo    • messages
echo    • reviews
echo.
echo 🔑 Default Admin Login:
echo    Email: admin@farmersmarket.com
echo    Password: admin123
echo.
echo 👥 All farmers and buyers use password: password123
echo.
pause