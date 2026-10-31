@echo off
echo ========================================
echo School Management System - Setup Script
echo ========================================
echo.

echo Step 1: Seeding Test Data...
echo ----------------------------------------
cd backend
call php artisan migrate:fresh --seed
if %errorlevel% neq 0 (
    echo ERROR: Failed to seed database
    pause
    exit /b 1
)
echo.
echo ✓ Test data seeded successfully!
echo.

echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo Test Data Created:
echo - Academic Years: 1
echo - Classes: 10
echo - Sections: 30
echo - Subjects: 8
echo - Teachers: 10
echo - Students: ~900
echo - Attendance Records: ~27,000
echo - Exams: 5
echo - Grades: ~7,200
echo - Fee Structures: 5
echo - Assignments: ~160
echo.
echo ========================================
echo Next Steps:
echo ========================================
echo.
echo 1. Start Backend Server:
echo    cd backend
echo    php artisan serve
echo.
echo 2. Start Frontend Server (in new terminal):
echo    cd frontend
echo    npm run dev
echo.
echo 3. Open Browser:
echo    http://localhost:5173
echo.
echo 4. Login:
echo    Email: admin@school.com
echo    Password: password
echo.
echo ========================================
pause

