@echo off
echo ====================================
echo   Rundu Farmers Marketplace Setup
echo ====================================
echo.

echo Checking if backend dependencies are installed...
cd backend
if not exist node_modules (
    echo Installing backend dependencies...
    npm install
    echo.
) else (
    echo Backend dependencies already installed.
    echo.
)

echo Setting up database with sample data...
npm run init-db
echo.

echo Starting backend server...
echo Backend will start on http://localhost:5000
echo.
echo To access the website:
echo 1. Open VS Code and install Live Server extension
echo 2. Right-click on index.html and select "Open with Live Server"
echo 3. Or serve the frontend using: python -m http.server 3000
echo.
echo Sample login credentials:
echo Farmer: maria@farmer.com / password123
echo Buyer: peter@buyer.com / password123
echo Admin: admin@farmersmarket.com / admin123
echo.

npm run dev