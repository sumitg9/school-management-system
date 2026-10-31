<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use App\Models\User;
use App\Models\AcademicYear;
use App\Models\ClassModel;
use App\Models\Section;
use App\Models\Subject;
use App\Models\Teacher;
use App\Models\Student;
use App\Models\ParentModel;
use App\Models\Attendance;
use App\Models\Exam;
use App\Models\ExamSchedule;
use App\Models\Grade;
use App\Models\FeeStructure;
use App\Models\FeePayment;
use App\Models\Assignment;
use App\Models\AssignmentSubmission;
use App\Models\Notification;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\PermissionRegistrar;
use Carbon\Carbon;

return new class extends Migration
{
    /**
     * Run the migrations - Seeds comprehensive demo data for all modules.
     */
    public function up(): void
    {
        // 1. Reset cached roles & permissions
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        $permissions = [
            'view-students', 'create-students', 'edit-students', 'delete-students',
            'view-teachers', 'create-teachers', 'edit-teachers', 'delete-teachers',
            'view-classes', 'create-classes', 'edit-classes', 'delete-classes',
            'view-attendance', 'mark-attendance', 'edit-attendance', 'delete-attendance',
            'view-exams', 'create-exams', 'edit-exams', 'delete-exams',
            'view-grades', 'enter-grades', 'edit-grades',
            'view-fees', 'create-fees', 'edit-fees', 'delete-fees', 'collect-fees',
            'view-assignments', 'create-assignments', 'edit-assignments', 'delete-assignments', 'grade-assignments',
            'view-reports', 'generate-reports',
            'manage-settings', 'manage-roles', 'manage-permissions',
        ];

        foreach ($permissions as $permissionName) {
            Permission::firstOrCreate(['name' => $permissionName, 'guard_name' => 'web']);
        }

        // Roles
        $rolesData = [
            'super-admin' => $permissions,
            'admin' => [
                'view-students', 'create-students', 'edit-students', 'delete-students',
                'view-teachers', 'create-teachers', 'edit-teachers', 'delete-teachers',
                'view-classes', 'create-classes', 'edit-classes', 'delete-classes',
                'view-attendance', 'mark-attendance', 'edit-attendance',
                'view-exams', 'create-exams', 'edit-exams',
                'view-grades', 'enter-grades', 'edit-grades',
                'view-fees', 'create-fees', 'edit-fees',
                'view-assignments', 'create-assignments', 'edit-assignments',
                'view-reports', 'generate-reports',
            ],
            'teacher' => [
                'view-students', 'view-classes',
                'view-attendance', 'mark-attendance',
                'view-exams', 'view-grades', 'enter-grades',
                'view-assignments', 'create-assignments', 'edit-assignments', 'grade-assignments',
            ],
            'student' => [
                'view-attendance', 'view-exams', 'view-grades', 'view-fees', 'view-assignments',
            ],
            'parent' => [
                'view-students', 'view-attendance', 'view-exams', 'view-grades', 'view-fees', 'view-assignments',
            ],
            'accountant' => [
                'view-students', 'view-fees', 'create-fees', 'edit-fees', 'collect-fees', 'view-reports', 'generate-reports',
            ],
            'librarian' => [
                'view-students', 'view-teachers',
            ],
            'receptionist' => [
                'view-students', 'view-teachers', 'view-classes',
            ],
        ];

        foreach ($rolesData as $roleName => $rolePerms) {
            $role = Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'web']);
            $role->syncPermissions($rolePerms);
        }

        // Precompute default password hash for speed
        $defaultPassword = Hash::make('password');

        // 2. Core Demo Users
        $coreUsers = [
            [
                'name' => 'Super Admin',
                'email' => 'superadmin@school.com',
                'role' => 'super-admin',
                'phone' => '+1234567890',
                'gender' => 'male',
            ],
            [
                'name' => 'Admin User',
                'email' => 'admin@school.com',
                'role' => 'admin',
                'phone' => '+1234567891',
                'gender' => 'male',
            ],
            [
                'name' => 'John Teacher',
                'email' => 'teacher@school.com',
                'role' => 'teacher',
                'phone' => '+1234567892',
                'gender' => 'male',
            ],
            [
                'name' => 'Jane Student',
                'email' => 'student@school.com',
                'role' => 'student',
                'phone' => '+1234567893',
                'gender' => 'female',
            ],
            [
                'name' => 'Parent User',
                'email' => 'parent@school.com',
                'role' => 'parent',
                'phone' => '+1234567894',
                'gender' => 'male',
            ],
            [
                'name' => 'Accountant User',
                'email' => 'accountant@school.com',
                'role' => 'accountant',
                'phone' => '+1234567895',
                'gender' => 'female',
            ],
        ];

        $userMap = [];
        foreach ($coreUsers as $uData) {
            $user = User::firstOrCreate(
                ['email' => $uData['email']],
                [
                    'name' => $uData['name'],
                    'password' => $defaultPassword,
                    'phone' => $uData['phone'],
                    'gender' => $uData['gender'],
                    'status' => 'active',
                    'date_of_birth' => '1990-01-01',
                    'address' => '123 School Ave, Education City',
                ]
            );

            if (!$user->hasRole($uData['role'])) {
                $user->assignRole($uData['role']);
            }
            $userMap[$uData['role']] = $user;
        }

        // 3. Academic Years
        $academicYear = AcademicYear::firstOrCreate(
            ['name' => '2024-2025'],
            [
                'start_date' => '2024-04-01',
                'end_date' => '2025-03-31',
                'is_current' => true,
                'status' => 'active',
            ]
        );

        AcademicYear::firstOrCreate(
            ['name' => '2023-2024'],
            [
                'start_date' => '2023-04-01',
                'end_date' => '2024-03-31',
                'is_current' => false,
                'status' => 'completed',
            ]
        );

        // 4. Classes & Sections
        $classes = [];
        for ($i = 1; $i <= 10; $i++) {
            $classes[$i] = ClassModel::firstOrCreate(
                ['name' => "Class {$i}"],
                [
                    'numeric_name' => (string)$i,
                    'order' => $i,
                    'description' => "Class {$i} - Standard Curriculum",
                    'status' => 'active',
                ]
            );
        }

        $sections = [];
        $sectionLetters = ['A', 'B', 'C'];
        foreach ($classes as $classNum => $classObj) {
            foreach ($sectionLetters as $secLetter) {
                $sections["{$classNum}_{$secLetter}"] = Section::firstOrCreate(
                    [
                        'class_id' => $classObj->id,
                        'name' => $secLetter,
                    ],
                    [
                        'capacity' => 40,
                        'current_strength' => 0,
                        'description' => "Section {$secLetter} of {$classObj->name}",
                        'status' => 'active',
                    ]
                );
            }
        }

        // 5. Subjects
        $subjectDefinitions = [
            ['name' => 'Mathematics', 'code' => 'MATH', 'type' => 'theory', 'total_marks' => 100, 'passing_marks' => 40],
            ['name' => 'English', 'code' => 'ENG', 'type' => 'theory', 'total_marks' => 100, 'passing_marks' => 40],
            ['name' => 'Science', 'code' => 'SCI', 'type' => 'both', 'total_marks' => 100, 'passing_marks' => 40],
            ['name' => 'Social Studies', 'code' => 'SST', 'type' => 'theory', 'total_marks' => 100, 'passing_marks' => 40],
            ['name' => 'Hindi', 'code' => 'HIN', 'type' => 'theory', 'total_marks' => 100, 'passing_marks' => 40],
            ['name' => 'Computer Science', 'code' => 'CS', 'type' => 'both', 'total_marks' => 100, 'passing_marks' => 40],
            ['name' => 'Physical Education', 'code' => 'PE', 'type' => 'practical', 'total_marks' => 50, 'passing_marks' => 20],
            ['name' => 'Art & Craft', 'code' => 'ART', 'type' => 'practical', 'total_marks' => 50, 'passing_marks' => 20],
        ];

        $subjects = [];
        foreach ($subjectDefinitions as $subDef) {
            $sub = Subject::firstOrCreate(
                ['code' => $subDef['code']],
                [
                    'name' => $subDef['name'],
                    'type' => $subDef['type'],
                    'total_marks' => $subDef['total_marks'],
                    'passing_marks' => $subDef['passing_marks'],
                    'description' => "Standard curriculum for {$subDef['name']}",
                    'status' => 'active',
                ]
            );
            $subjects[$subDef['code']] = $sub;

            // Link to classes
            foreach ($classes as $classObj) {
                if (!$classObj->subjects()->where('subjects.id', $sub->id)->exists()) {
                    $classObj->subjects()->attach($sub->id, [
                        'is_elective' => false,
                        'total_marks' => $subDef['total_marks'],
                        'passing_marks' => $subDef['passing_marks'],
                    ]);
                }
            }
        }

        // 6. Teachers
        $teacherProfiles = [
            ['first_name' => 'John', 'last_name' => 'Teacher', 'email' => 'teacher@school.com', 'dept' => 'Mathematics', 'gender' => 'male', 'qual' => 'M.Sc., B.Ed', 'exp' => 8, 'desig' => 'Senior Teacher'],
            ['first_name' => 'Rajesh', 'last_name' => 'Kumar', 'email' => 'rajesh.kumar@school.com', 'dept' => 'Mathematics', 'gender' => 'male', 'qual' => 'M.Sc., B.Ed', 'exp' => 10, 'desig' => 'HOD Mathematics'],
            ['first_name' => 'Priya', 'last_name' => 'Sharma', 'email' => 'priya.sharma@school.com', 'dept' => 'English', 'gender' => 'female', 'qual' => 'M.A. English', 'exp' => 6, 'desig' => 'English Teacher'],
            ['first_name' => 'Amit', 'last_name' => 'Patel', 'email' => 'amit.patel@school.com', 'dept' => 'Science', 'gender' => 'male', 'qual' => 'M.Sc. Physics', 'exp' => 7, 'desig' => 'Science Teacher'],
            ['first_name' => 'Anjali', 'last_name' => 'Gupta', 'email' => 'anjali.gupta@school.com', 'dept' => 'Computer Science', 'gender' => 'female', 'qual' => 'M.C.A.', 'exp' => 5, 'desig' => 'CS Teacher'],
            ['first_name' => 'Rahul', 'last_name' => 'Mehta', 'email' => 'rahul.mehta@school.com', 'dept' => 'Physical Education', 'gender' => 'male', 'qual' => 'B.P.Ed', 'exp' => 4, 'desig' => 'Sports Coach'],
        ];

        $teachers = [];
        $tIdx = 1;
        foreach ($teacherProfiles as $tp) {
            $u = User::firstOrCreate(
                ['email' => $tp['email']],
                [
                    'name' => "{$tp['first_name']} {$tp['last_name']}",
                    'password' => $defaultPassword,
                    'phone' => '9876543' . str_pad($tIdx, 3, '0', STR_PAD_LEFT),
                    'gender' => $tp['gender'],
                    'status' => 'active',
                    'date_of_birth' => '1985-06-15',
                    'address' => 'Teacher Colony, Education City',
                ]
            );

            if (!$u->hasRole('teacher')) {
                $u->assignRole('teacher');
            }

            $empId = 'TCH' . str_pad($tIdx, 4, '0', STR_PAD_LEFT);
            $teacher = Teacher::firstOrCreate(
                ['user_id' => $u->id],
                [
                    'employee_id' => $empId,
                    'first_name' => $tp['first_name'],
                    'last_name' => $tp['last_name'],
                    'joining_date' => '2021-06-01',
                    'qualification' => $tp['qual'],
                    'specialization' => $tp['dept'],
                    'experience_years' => $tp['exp'],
                    'designation' => $tp['desig'],
                    'department' => $tp['dept'],
                    'salary' => 55000.00,
                    'employment_type' => 'full-time',
                    'status' => 'active',
                ]
            );
            $teachers[] = $teacher;
            $tIdx++;
        }

        // 7. Demo Students
        $studentSeeds = [
            [
                'first_name' => 'Jane', 'last_name' => 'Student', 'email' => 'student@school.com',
                'admission_number' => 'STU0001', 'class_num' => 10, 'sec' => 'A', 'roll' => '1', 'gender' => 'female',
            ],
            [
                'first_name' => 'Aarav', 'last_name' => 'Kumar', 'email' => 'aarav.kumar@student.com',
                'admission_number' => 'STU0002', 'class_num' => 10, 'sec' => 'A', 'roll' => '2', 'gender' => 'male',
            ],
            [
                'first_name' => 'Diya', 'last_name' => 'Sharma', 'email' => 'diya.sharma@student.com',
                'admission_number' => 'STU0003', 'class_num' => 10, 'sec' => 'B', 'roll' => '1', 'gender' => 'female',
            ],
            [
                'first_name' => 'Vivaan', 'last_name' => 'Patel', 'email' => 'vivaan.patel@student.com',
                'admission_number' => 'STU0004', 'class_num' => 9, 'sec' => 'A', 'roll' => '1', 'gender' => 'male',
            ],
            [
                'first_name' => 'Ananya', 'last_name' => 'Singh', 'email' => 'ananya.singh@student.com',
                'admission_number' => 'STU0005', 'class_num' => 8, 'sec' => 'A', 'roll' => '1', 'gender' => 'female',
            ],
        ];

        $students = [];
        foreach ($studentSeeds as $sData) {
            $u = User::firstOrCreate(
                ['email' => $sData['email']],
                [
                    'name' => "{$sData['first_name']} {$sData['last_name']}",
                    'password' => $defaultPassword,
                    'phone' => '987000' . rand(1000, 9999),
                    'gender' => $sData['gender'],
                    'status' => 'active',
                    'date_of_birth' => '2008-05-10',
                    'address' => 'Student Residence, Education City',
                ]
            );

            if (!$u->hasRole('student')) {
                $u->assignRole('student');
            }

            $cls = $classes[$sData['class_num']];
            $sec = $sections["{$sData['class_num']}_{$sData['sec']}"];

            $student = Student::firstOrCreate(
                ['admission_number' => $sData['admission_number']],
                [
                    'user_id' => $u->id,
                    'academic_year_id' => $academicYear->id,
                    'class_id' => $cls->id,
                    'section_id' => $sec->id,
                    'admission_date' => '2023-04-15',
                    'first_name' => $sData['first_name'],
                    'last_name' => $sData['last_name'],
                    'roll_number' => $sData['roll'],
                    'blood_group' => 'O+',
                    'nationality' => 'Indian',
                    'emergency_contact_name' => 'Parent User',
                    'emergency_contact_phone' => '+1234567894',
                    'emergency_contact_relation' => 'Father',
                    'status' => 'active',
                ]
            );
            $students[] = $student;
        }

        // 8. Demo Parent Profile and Link
        $parentUser = $userMap['parent'] ?? User::where('email', 'parent@school.com')->first();
        if ($parentUser) {
            $parentProfile = ParentModel::firstOrCreate(
                ['user_id' => $parentUser->id],
                [
                    'father_name' => 'Robert Parent',
                    'father_phone' => '+1234567894',
                    'father_email' => 'parent@school.com',
                    'father_occupation' => 'Architect',
                    'father_annual_income' => '950000',
                    'mother_name' => 'Mary Parent',
                    'mother_phone' => '+1234567899',
                    'mother_email' => 'mary.parent@school.com',
                    'mother_occupation' => 'Physician',
                    'mother_annual_income' => '1200000',
                    'status' => 'active',
                ]
            );

            // Link parent with Jane Student (first student)
            if (!empty($students)) {
                $primaryStudent = $students[0];
                if (!$parentProfile->students()->where('students.id', $primaryStudent->id)->exists()) {
                    $parentProfile->students()->attach($primaryStudent->id, [
                        'relation' => 'father',
                        'is_primary' => true,
                    ]);
                }
            }
        }

        // 9. Attendance (last 10 days)
        foreach ($students as $stu) {
            for ($d = 0; $d < 10; $d++) {
                $date = Carbon::now()->subDays($d)->format('Y-m-d');
                $status = ($d % 7 == 5) ? 'late' : (($d % 9 == 0) ? 'absent' : 'present');

                Attendance::firstOrCreate(
                    [
                        'student_id' => $stu->id,
                        'date' => $date,
                    ],
                    [
                        'class_id' => $stu->class_id,
                        'section_id' => $stu->section_id,
                        'status' => $status,
                        'remarks' => $status === 'late' ? 'Traffic delay' : null,
                    ]
                );
            }
        }

        // 10. Exams & Exam Schedules
        $firstTermExam = Exam::firstOrCreate(
            ['code' => 'FTE-2024'],
            [
                'academic_year_id' => $academicYear->id,
                'name' => 'First Term Exam',
                'type' => 'mid-term',
                'start_date' => '2024-07-15',
                'end_date' => '2024-07-25',
                'description' => 'First Term Mid-Session Assessment',
                'publish_results' => true,
                'status' => 'completed',
            ]
        );

        $finalExam = Exam::firstOrCreate(
            ['code' => 'FE-2025'],
            [
                'academic_year_id' => $academicYear->id,
                'name' => 'Final Annual Exam',
                'type' => 'final',
                'start_date' => '2025-03-01',
                'end_date' => '2025-03-15',
                'description' => 'Annual Final Board Examination',
                'publish_results' => false,
                'status' => 'scheduled',
            ]
        );

        // Schedules for Class 10
        $class10 = $classes[10];
        $examDate = Carbon::parse('2024-07-15');
        foreach ($subjects as $sub) {
            ExamSchedule::firstOrCreate(
                [
                    'exam_id' => $firstTermExam->id,
                    'class_id' => $class10->id,
                    'subject_id' => $sub->id,
                ],
                [
                    'exam_date' => $examDate->format('Y-m-d'),
                    'start_time' => '09:00:00',
                    'end_time' => '12:00:00',
                    'room_number' => 'Hall 101',
                    'total_marks' => $sub->total_marks,
                    'passing_marks' => $sub->passing_marks,
                    'instructions' => 'Bring admit card and standard stationery. Electronic devices not permitted.',
                ]
            );
            $examDate->addDays(2);
        }

        // 11. Grades for Students
        foreach ($students as $stu) {
            foreach ($subjects as $sub) {
                $marks = rand(65, 96);
                $gradeLetter = $marks >= 90 ? 'A+' : ($marks >= 80 ? 'A' : ($marks >= 70 ? 'B+' : 'B'));

                Grade::firstOrCreate(
                    [
                        'exam_id' => $firstTermExam->id,
                        'student_id' => $stu->id,
                        'subject_id' => $sub->id,
                    ],
                    [
                        'class_id' => $stu->class_id,
                        'section_id' => $stu->section_id,
                        'marks_obtained' => $marks,
                        'total_marks' => $sub->total_marks,
                        'grade' => $gradeLetter,
                        'remarks' => 'Good academic performance',
                        'is_absent' => false,
                    ]
                );
            }
        }

        // 12. Fee Structures & Payments
        $feeTypes = [
            ['name' => 'Tuition Fee', 'type' => 'tuition', 'amount' => 18000.00, 'due' => '2024-04-30'],
            ['name' => 'Transport Fee', 'type' => 'transport', 'amount' => 6000.00, 'due' => '2024-04-30'],
            ['name' => 'Computer Lab Fee', 'type' => 'lab', 'amount' => 2500.00, 'due' => '2024-05-15'],
            ['name' => 'Examination Fee', 'type' => 'exam', 'amount' => 1500.00, 'due' => '2024-06-30'],
        ];

        $feeStructures = [];
        foreach ($classes as $cNum => $cObj) {
            foreach ($feeTypes as $fData) {
                $feeStructures[] = FeeStructure::firstOrCreate(
                    [
                        'academic_year_id' => $academicYear->id,
                        'class_id' => $cObj->id,
                        'name' => $fData['name'],
                    ],
                    [
                        'type' => $fData['type'],
                        'amount' => $fData['amount'],
                        'frequency' => 'yearly',
                        'due_date' => $fData['due'],
                        'is_mandatory' => true,
                        'description' => "{$fData['name']} for {$cObj->name}",
                        'status' => 'active',
                    ]
                );
            }
        }

        // Create sample Fee Payments for Jane Student
        if (!empty($students) && !empty($feeStructures)) {
            $student1 = $students[0];
            $adminUser = $userMap['admin'] ?? User::first();

            FeePayment::firstOrCreate(
                ['receipt_number' => 'REC-2024-0001'],
                [
                    'student_id' => $student1->id,
                    'fee_structure_id' => $feeStructures[0]->id,
                    'amount' => $feeStructures[0]->amount,
                    'discount' => 0.00,
                    'fine' => 0.00,
                    'total_amount' => $feeStructures[0]->amount,
                    'payment_date' => '2024-04-20',
                    'payment_method' => 'online',
                    'transaction_id' => 'TXN-9876543210',
                    'remarks' => 'Annual Tuition Fee Paid in Full',
                    'status' => 'completed',
                    'collected_by' => $adminUser?->id,
                ]
            );

            if (isset($feeStructures[1])) {
                FeePayment::firstOrCreate(
                    ['receipt_number' => 'REC-2024-0002'],
                    [
                        'student_id' => $student1->id,
                        'fee_structure_id' => $feeStructures[1]->id,
                        'amount' => $feeStructures[1]->amount,
                        'discount' => 0.00,
                        'fine' => 0.00,
                        'total_amount' => $feeStructures[1]->amount,
                        'payment_date' => '2024-04-22',
                        'payment_method' => 'card',
                        'transaction_id' => 'TXN-1122334455',
                        'remarks' => 'Transport Fee Paid via POS',
                        'status' => 'completed',
                        'collected_by' => $adminUser?->id,
                    ]
                );
            }
        }

        // 13. Assignments & Submissions
        $mathSub = $subjects['MATH'] ?? Subject::first();
        $assignedTeacher = $teachers[0] ?? Teacher::first();

        $assignment1 = Assignment::firstOrCreate(
            [
                'class_id' => $class10->id,
                'subject_id' => $mathSub->id,
                'title' => 'Trigonometry Problem Set 1',
            ],
            [
                'section_id' => $sections['10_A']->id,
                'teacher_id' => $assignedTeacher->id,
                'description' => 'Solve exercises 4.1 to 4.4 from textbook Chapter 4 and submit solutions.',
                'assigned_date' => Carbon::now()->subDays(7)->format('Y-m-d'),
                'due_date' => Carbon::now()->addDays(7)->format('Y-m-d'),
                'total_marks' => 25.00,
                'status' => 'active',
            ]
        );

        $assignment2 = Assignment::firstOrCreate(
            [
                'class_id' => $class10->id,
                'subject_id' => $subjects['ENG']->id ?? $mathSub->id,
                'title' => 'English Literature Essay: Macbeth Act I',
            ],
            [
                'section_id' => $sections['10_A']->id,
                'teacher_id' => $teachers[1]->id ?? $assignedTeacher->id,
                'description' => 'Write a 500-word critical analysis of Macbeth Act I Scene 3.',
                'assigned_date' => Carbon::now()->subDays(10)->format('Y-m-d'),
                'due_date' => Carbon::now()->subDays(2)->format('Y-m-d'),
                'total_marks' => 20.00,
                'status' => 'active',
            ]
        );

        // Submissions for Jane Student
        if (!empty($students)) {
            $student1 = $students[0];
            AssignmentSubmission::firstOrCreate(
                [
                    'assignment_id' => $assignment1->id,
                    'student_id' => $student1->id,
                ],
                [
                    'submission_text' => 'Attached trigonometry solutions for exercises 4.1 to 4.4.',
                    'submitted_at' => Carbon::now()->subDays(2),
                    'marks_obtained' => 24.00,
                    'feedback' => 'Excellent work on solving proofs with clear step-by-step reasoning.',
                    'graded_at' => Carbon::now()->subDay(),
                    'graded_by' => $userMap['teacher']->id ?? null,
                    'status' => 'graded',
                ]
            );

            AssignmentSubmission::firstOrCreate(
                [
                    'assignment_id' => $assignment2->id,
                    'student_id' => $student1->id,
                ],
                [
                    'submission_text' => 'Essay submission: Analysis of Macbeth and the Witches prophesy.',
                    'submitted_at' => Carbon::now()->subDays(3),
                    'marks_obtained' => 18.50,
                    'feedback' => 'Well-structured argument and good citations.',
                    'graded_at' => Carbon::now()->subDays(1),
                    'graded_by' => $userMap['teacher']->id ?? null,
                    'status' => 'graded',
                ]
            );
        }

        // 14. Notifications for Users
        $notificationItems = [
            [
                'user_role' => 'admin',
                'type' => 'system_alert',
                'title' => 'Academic Term Setup Completed',
                'message' => 'Academic Year 2024-2025 has been initialized with all classes, sections, and subjects.',
                'data' => ['academic_year' => '2024-2025'],
            ],
            [
                'user_role' => 'admin',
                'type' => 'fee_summary',
                'title' => 'Monthly Fee Collection Summary',
                'message' => 'New fee payments recorded. Total collection for the current term is on schedule.',
                'data' => ['total_collected' => 24000],
            ],
            [
                'user_role' => 'teacher',
                'type' => 'assignment_submitted',
                'title' => 'New Assignment Submissions',
                'message' => 'Students of Class 10 Section A have submitted solutions for Trigonometry Problem Set 1.',
                'data' => ['assignment' => 'Trigonometry Problem Set 1'],
            ],
            [
                'user_role' => 'student',
                'type' => 'grade_published',
                'title' => 'First Term Exam Results Available',
                'message' => 'Your report card for the First Term Examination has been published. Check your grades.',
                'data' => ['exam' => 'First Term Exam'],
            ],
            [
                'user_role' => 'student',
                'type' => 'assignment_reminder',
                'title' => 'Upcoming Assignment Deadline',
                'message' => 'Trigonometry Problem Set 1 is due next week. Please ensure submission on time.',
                'data' => ['due_days' => 7],
            ],
            [
                'user_role' => 'parent',
                'type' => 'fee_receipt',
                'title' => 'Fee Payment Receipt Issued',
                'message' => 'Payment of 18,000 for Tuition Fee has been received and confirmed. Receipt: REC-2024-0001.',
                'data' => ['receipt_number' => 'REC-2024-0001', 'amount' => 18000],
            ],
            [
                'user_role' => 'parent',
                'type' => 'attendance_report',
                'title' => 'Weekly Attendance Update',
                'message' => 'Your child attended all scheduled classes this week with 95% attendance.',
                'data' => ['attendance_rate' => 95],
            ],
        ];

        foreach ($notificationItems as $notif) {
            $targetUser = $userMap[$notif['user_role']] ?? null;
            if ($targetUser) {
                Notification::firstOrCreate(
                    [
                        'user_id' => $targetUser->id,
                        'title' => $notif['title'],
                    ],
                    [
                        'type' => $notif['type'],
                        'message' => $notif['message'],
                        'data' => $notif['data'],
                        'is_read' => false,
                    ]
                );
            }
        }
    }

    /**
     * Reverse the migrations - Cleans up seeded demo data.
     */
    public function down(): void
    {
        $demoEmails = [
            'superadmin@school.com',
            'admin@school.com',
            'teacher@school.com',
            'student@school.com',
            'parent@school.com',
            'accountant@school.com',
            'rajesh.kumar@school.com',
            'priya.sharma@school.com',
            'amit.patel@school.com',
            'anjali.gupta@school.com',
            'rahul.mehta@school.com',
            'aarav.kumar@student.com',
            'diya.sharma@student.com',
            'vivaan.patel@student.com',
            'ananya.singh@student.com',
        ];

        // Delete demo users and related records cascading
        User::whereIn('email', $demoEmails)->forceDelete();

        // Delete demo exams
        Exam::whereIn('code', ['FTE-2024', 'FE-2025'])->forceDelete();

        // Delete academic years
        AcademicYear::whereIn('name', ['2024-2025', '2023-2024'])->forceDelete();
    }
};
