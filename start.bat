@echo off
echo ==============================================
echo Starting 100 Blessings App
echo ==============================================

echo.
echo Starting Backend Server (Port 3001) in a new window...
cd backend
start cmd /k "node server.js"
cd ..

echo.
echo Starting Frontend Server (Port 5173) in a new window...
cd frontend
start cmd /k "npm run dev"
cd ..

echo.
echo ==============================================
echo Both servers are starting up!
echo Your default browser should open or you can visit:
echo http://localhost:5173/
echo ==============================================
