@echo off
start cmd /k "cd server && npm start"
start cmd /k "cd client && npm run dev"
echo Application started.
echo Backend running on http://localhost:5000
echo Frontend running on http://localhost:5173
echo.
echo If Frontend doesn't open automatically, visit http://localhost:5173
pause
