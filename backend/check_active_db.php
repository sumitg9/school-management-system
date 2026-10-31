<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;
use App\Models\ClassModel;
use App\Models\Section;
use App\Models\Subject;
use App\Models\Student;
use App\Models\Teacher;
use App\Models\Attendance;
use App\Models\Grade;
use App\Models\FeePayment;
use App\Models\Notification;

echo "Users: " . User::count() . "\n";
echo "Classes: " . ClassModel::count() . "\n";
echo "Sections: " . Section::count() . "\n";
echo "Subjects: " . Subject::count() . "\n";
echo "Students: " . Student::count() . "\n";
echo "Teachers: " . Teacher::count() . "\n";
echo "Attendances: " . Attendance::count() . "\n";
echo "Grades: " . Grade::count() . "\n";
echo "FeePayments: " . FeePayment::count() . "\n";
echo "Notifications: " . Notification::count() . "\n";
