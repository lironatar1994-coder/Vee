@echo off
echo ==============================================
echo Installing 100 Blessings App Dependencies...
echo ==============================================

echo.
echo [1/2] Installing Backend Dependencies...
cd backend
call npm install
cd ..

echo.
echo [2/2] Installing Frontend Dependencies...
cd frontend
call npm install
cd ..

echo.
echo ==============================================
echo All dependencies installed successfully!
echo You can now run start.bat to launch the app.
echo ==============================================
pause
