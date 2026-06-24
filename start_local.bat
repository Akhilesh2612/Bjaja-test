@echo off
cd backend
echo Installing backend dependencies...
call npm install
echo.
echo Starting backend server on http://localhost:5000...
node index.js
pause
