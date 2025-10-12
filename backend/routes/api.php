<?php

use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\AcademicYearController;
use App\Http\Controllers\Api\V1\StudentController;
use App\Http\Controllers\Api\V1\TeacherController;
use App\Http\Controllers\Api\V1\ClassController;
use App\Http\Controllers\Api\V1\SectionController;
use App\Http\Controllers\Api\V1\SubjectController;
use App\Http\Controllers\Api\V1\AttendanceController;
use App\Http\Controllers\Api\V1\ExamController;
use App\Http\Controllers\Api\V1\GradeController;
use App\Http\Controllers\Api\V1\FeeController;
use App\Http\Controllers\Api\V1\AssignmentController;
use App\Http\Controllers\Api\V1\NotificationController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/

// API Version 1
Route::prefix('v1')->group(function () {

    // Public routes
    Route::post('/auth/register', [AuthController::class, 'register']);
    Route::post('/auth/login', [AuthController::class, 'login']);
    Route::post('/auth/forgot-password', [AuthController::class, 'forgotPassword']);
    Route::post('/auth/reset-password', [AuthController::class, 'resetPassword']);

    // Protected routes
    Route::middleware('auth:sanctum')->group(function () {

        // Authentication
        Route::post('/auth/logout', [AuthController::class, 'logout']);
        Route::get('/auth/me', [AuthController::class, 'me']);
        Route::post('/auth/refresh', [AuthController::class, 'refresh']);
        Route::post('/auth/change-password', [AuthController::class, 'changePassword']);

        // Academic Years
        Route::get('/academic-years/current', [AcademicYearController::class, 'getCurrent']);
        Route::post('/academic-years/{id}/set-current', [AcademicYearController::class, 'setCurrent']);
        Route::apiResource('academic-years', AcademicYearController::class);

        // Students
        Route::get('/students/statistics', [StudentController::class, 'statistics']);
        Route::get('/students/export-pdf', [StudentController::class, 'exportPDF']);
        Route::apiResource('students', StudentController::class);

        // Teachers
        Route::get('/teachers/statistics', [TeacherController::class, 'statistics']);
        Route::apiResource('teachers', TeacherController::class);

        // Classes
        Route::post('/classes/{id}/assign-subjects', [ClassController::class, 'assignSubjects']);
        Route::apiResource('classes', ClassController::class);

        // Sections
        Route::apiResource('sections', SectionController::class);

        // Subjects
        Route::apiResource('subjects', SubjectController::class);

        // Attendance
        Route::post('/attendance/mark', [AttendanceController::class, 'markAttendance']);
        Route::get('/attendance/by-date', [AttendanceController::class, 'getByDate']);
        Route::get('/attendance/statistics', [AttendanceController::class, 'statistics']);
        Route::apiResource('attendance', AttendanceController::class)->only(['index', 'update']);

        // Exams
        Route::post('/exams/{id}/schedule', [ExamController::class, 'createSchedule']);
        Route::get('/exams/{id}/schedule', [ExamController::class, 'getSchedule']);
        Route::apiResource('exams', ExamController::class);

        // Grades
        Route::post('/grades/enter', [GradeController::class, 'enterGrades']);
        Route::post('/grades/bulk', [GradeController::class, 'bulkCreate']);
        Route::get('/grades/report-card/{studentId}', [GradeController::class, 'getReportCard']);
        Route::get('/grades/report-card/{studentId}/pdf', [GradeController::class, 'generateReportCardPDF']);
        Route::apiResource('grades', GradeController::class)->only(['index', 'update']);

        // Fees
        Route::get('/fee-structures', [FeeController::class, 'indexStructures']);
        Route::post('/fee-structures', [FeeController::class, 'storeStructure']);
        Route::get('/fee-payments', [FeeController::class, 'indexPayments']);
        Route::post('/fee-payments', [FeeController::class, 'collectPayment']);
        Route::get('/fee-payments/statistics', [FeeController::class, 'statistics']);
        Route::get('/fee-payments/student/{studentId}', [FeeController::class, 'getStudentFees']);
        Route::get('/fee-payments/{paymentId}/receipt', [FeeController::class, 'generateReceipt']);

        // Assignments
        Route::post('/assignments/{id}/submit', [AssignmentController::class, 'submit']);
        Route::post('/assignment-submissions/{id}/grade', [AssignmentController::class, 'gradeSubmission']);
        Route::get('/assignments/{id}/submissions', [AssignmentController::class, 'getSubmissions']);
        Route::get('/assignments/student/{studentId}', [AssignmentController::class, 'getStudentAssignments']);
        Route::apiResource('assignments', AssignmentController::class);

        // Notifications
        Route::get('/notifications', [NotificationController::class, 'index']);
        Route::get('/notifications/unread-count', [NotificationController::class, 'unreadCount']);
        Route::post('/notifications', [NotificationController::class, 'store']);
        Route::post('/notifications/{id}/mark-as-read', [NotificationController::class, 'markAsRead']);
        Route::post('/notifications/mark-all-as-read', [NotificationController::class, 'markAllAsRead']);
        Route::delete('/notifications/{id}', [NotificationController::class, 'destroy']);
        Route::delete('/notifications/delete-all-read', [NotificationController::class, 'deleteAllRead']);
    });
});

