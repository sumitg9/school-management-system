<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\AcademicYear;
use App\Models\Student;
use App\Models\Teacher;
use App\Models\ClassModel;
use App\Models\Section;
use App\Models\Subject;
use App\Models\Attendance;
use App\Models\Exam;
use App\Models\Grade;
use App\Models\FeeStructure;
use App\Models\Assignment;
use Carbon\Carbon;

class ComprehensiveTestDataSeeder extends Seeder
{
    public function run(): void
    {
        $this->command->info('Creating comprehensive test data for all modules...');

        // Create Academic Year
        $academicYear = AcademicYear::create([
            'name' => '2024-2025',
            'start_date' => '2024-04-01',
            'end_date' => '2025-03-31',
            'is_current' => true,
            'status' => 'active',
        ]);

        $this->command->info('✓ Academic Year created');

        // Create 10 Classes
        $classes = [];
        for ($i = 1; $i <= 10; $i++) {
            $classes[] = ClassModel::create([
                'name' => "Class {$i}",
                'numeric_name' => (string)$i,
                'order' => $i,
                'description' => "Standard {$i} - Academic Year {$academicYear->name}",
                'status' => 'active',
            ]);
        }

        $this->command->info('✓ 10 Classes created');

        // Create 3 Sections per class (A, B, C)
        $sections = [];
        $sectionNames = ['A', 'B', 'C'];
        foreach ($classes as $class) {
            foreach ($sectionNames as $sectionName) {
                $sections[] = Section::create([
                    'class_id' => $class->id,
                    'name' => $sectionName,
                    'capacity' => 40,
                    'current_strength' => 0,
                    'description' => "Section {$sectionName} of {$class->name}",
                    'status' => 'active',
                ]);
            }
        }

        $this->command->info('✓ 30 Sections created (3 per class)');

        // Create 8 Subjects
        $subjectData = [
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
        foreach ($subjectData as $data) {
            $subjects[] = Subject::create([
                'name' => $data['name'],
                'code' => $data['code'],
                'type' => $data['type'],
                'total_marks' => $data['total_marks'],
                'passing_marks' => $data['passing_marks'],
                'description' => $data['name'] . ' subject for all classes',
                'status' => 'active',
            ]);
        }

        $this->command->info('✓ 8 Subjects created');

        // Create 15 Teachers
        $teacherData = [
            ['first_name' => 'Rajesh', 'last_name' => 'Kumar', 'email' => 'rajesh.kumar@school.com', 'department' => 'Mathematics', 'gender' => 'male'],
            ['first_name' => 'Priya', 'last_name' => 'Sharma', 'email' => 'priya.sharma@school.com', 'department' => 'English', 'gender' => 'female'],
            ['first_name' => 'Amit', 'last_name' => 'Patel', 'email' => 'amit.patel@school.com', 'department' => 'Science', 'gender' => 'male'],
            ['first_name' => 'Sunita', 'last_name' => 'Verma', 'email' => 'sunita.verma@school.com', 'department' => 'Social Studies', 'gender' => 'female'],
            ['first_name' => 'Vikram', 'last_name' => 'Singh', 'email' => 'vikram.singh@school.com', 'department' => 'Hindi', 'gender' => 'male'],
            ['first_name' => 'Anjali', 'last_name' => 'Gupta', 'email' => 'anjali.gupta@school.com', 'department' => 'Computer Science', 'gender' => 'female'],
            ['first_name' => 'Rahul', 'last_name' => 'Mehta', 'email' => 'rahul.mehta@school.com', 'department' => 'Physical Education', 'gender' => 'male'],
            ['first_name' => 'Neha', 'last_name' => 'Reddy', 'email' => 'neha.reddy@school.com', 'department' => 'Art', 'gender' => 'female'],
            ['first_name' => 'Suresh', 'last_name' => 'Rao', 'email' => 'suresh.rao@school.com', 'department' => 'Mathematics', 'gender' => 'male'],
            ['first_name' => 'Kavita', 'last_name' => 'Joshi', 'email' => 'kavita.joshi@school.com', 'department' => 'English', 'gender' => 'female'],
            ['first_name' => 'Deepak', 'last_name' => 'Nair', 'email' => 'deepak.nair@school.com', 'department' => 'Science', 'gender' => 'male'],
            ['first_name' => 'Pooja', 'last_name' => 'Desai', 'email' => 'pooja.desai@school.com', 'department' => 'Social Studies', 'gender' => 'female'],
            ['first_name' => 'Arun', 'last_name' => 'Iyer', 'email' => 'arun.iyer@school.com', 'department' => 'Hindi', 'gender' => 'male'],
            ['first_name' => 'Sneha', 'last_name' => 'Pillai', 'email' => 'sneha.pillai@school.com', 'department' => 'Computer Science', 'gender' => 'female'],
            ['first_name' => 'Manoj', 'last_name' => 'Chopra', 'email' => 'manoj.chopra@school.com', 'department' => 'Mathematics', 'gender' => 'male'],
        ];

        $teachers = [];
        $teacherCount = 1;
        foreach ($teacherData as $data) {
            // Create user
            $user = \App\Models\User::create([
                'name' => $data['first_name'] . ' ' . $data['last_name'],
                'email' => $data['email'],
                'password' => bcrypt('password'),
                'phone' => '9876543' . str_pad($teacherCount, 3, '0', STR_PAD_LEFT),
                'gender' => $data['gender'],
                'date_of_birth' => Carbon::now()->subYears(rand(28, 50))->format('Y-m-d'),
                'address' => rand(1, 999) . ' Teacher Colony, Mumbai, Maharashtra',
            ]);

            $user->assignRole('teacher');

            // Create teacher
            $teacher = Teacher::create([
                'user_id' => $user->id,
                'employee_id' => 'TCH' . str_pad($teacherCount, 4, '0', STR_PAD_LEFT),
                'first_name' => $data['first_name'],
                'last_name' => $data['last_name'],
                'joining_date' => Carbon::now()->subYears(rand(1, 15))->format('Y-m-d'),
                'qualification' => ['B.Ed', 'M.Ed', 'M.A.', 'M.Sc.', 'M.Tech', 'Ph.D'][rand(0, 5)],
                'experience_years' => rand(1, 20),
                'department' => $data['department'],
                'salary' => rand(30000, 80000),
                'employment_type' => ['full-time', 'part-time', 'contract'][rand(0, 2)],
                'status' => 'active',
            ]);

            $teachers[] = $teacher;
            $teacherCount++;
        }

        $this->command->info('✓ 15 Teachers created');

        // Create Students (30 per section = 900 total)
        $firstNames = [
            'male' => ['Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Arnav', 'Ayaan', 'Krishna', 'Ishaan', 'Shaurya', 'Atharv', 'Advait', 'Pranav', 'Dhruv'],
            'female' => ['Ananya', 'Diya', 'Aadhya', 'Saanvi', 'Kiara', 'Anika', 'Navya', 'Angel', 'Pari', 'Myra', 'Sara', 'Ira', 'Riya', 'Zara', 'Aaradhya']
        ];
        $lastNames = ['Kumar', 'Sharma', 'Patel', 'Singh', 'Verma', 'Gupta', 'Reddy', 'Rao', 'Mehta', 'Joshi', 'Nair', 'Desai', 'Iyer', 'Pillai', 'Chopra'];

        $students = [];
        $studentCount = 0;

        foreach ($sections as $section) {
            $studentsPerSection = 30;
            for ($i = 0; $i < $studentsPerSection; $i++) {
                $studentCount++;
                $gender = ($i % 2 == 0) ? 'male' : 'female';
                $firstName = $firstNames[$gender][array_rand($firstNames[$gender])];
                $lastName = $lastNames[array_rand($lastNames)];

                // Create user
                $user = \App\Models\User::create([
                    'name' => $firstName . ' ' . $lastName,
                    'email' => strtolower($firstName . '.' . $lastName . $studentCount . '@student.com'),
                    'password' => bcrypt('password'),
                    'phone' => '98765' . str_pad($studentCount, 5, '0', STR_PAD_LEFT),
                    'gender' => $gender,
                    'date_of_birth' => Carbon::now()->subYears(rand(6, 16))->format('Y-m-d'),
                    'address' => rand(1, 999) . ' Main Street, Mumbai, Maharashtra',
                ]);

                $user->assignRole('student');

                // Create student
                $student = Student::create([
                    'user_id' => $user->id,
                    'academic_year_id' => $academicYear->id,
                    'class_id' => $section->class_id,
                    'section_id' => $section->id,
                    'admission_number' => 'STU' . str_pad($studentCount, 4, '0', STR_PAD_LEFT),
                    'admission_date' => Carbon::now()->subMonths(rand(1, 24))->format('Y-m-d'),
                    'first_name' => $firstName,
                    'last_name' => $lastName,
                    'roll_number' => ($i + 1),
                    'blood_group' => ['A+', 'B+', 'O+', 'AB+', 'A-', 'B-', 'O-', 'AB-'][rand(0, 7)],
                    'nationality' => 'Indian',
                    'status' => 'active',
                ]);

                $students[] = $student;
            }
        }

        $this->command->info("✓ {$studentCount} Students created");

        // Create Attendance Records (last 30 days, 85% attendance rate)
        $attendanceCount = 0;
        for ($day = 0; $day < 30; $day++) {
            $date = Carbon::now()->subDays($day)->format('Y-m-d');

            foreach ($students as $student) {
                // 85% attendance rate
                if (rand(1, 100) <= 85) {
                    Attendance::create([
                        'student_id' => $student->id,
                        'class_id' => $student->class_id,
                        'section_id' => $student->section_id,
                        'date' => $date,
                        'status' => ['present', 'present', 'present', 'late'][rand(0, 3)],
                        'remarks' => null,
                    ]);
                    $attendanceCount++;
                } else {
                    // 15% absent/on-leave
                    Attendance::create([
                        'student_id' => $student->id,
                        'class_id' => $student->class_id,
                        'section_id' => $student->section_id,
                        'date' => $date,
                        'status' => ['absent', 'on-leave', 'half-day'][rand(0, 2)],
                        'remarks' => ['Sick', 'Family emergency', 'Medical appointment'][rand(0, 2)],
                    ]);
                    $attendanceCount++;
                }
            }
        }

        $this->command->info("✓ {$attendanceCount} Attendance records created (30 days)");

        // Create 5 Exams
        $examData = [
            ['name' => 'First Term Exam', 'code' => 'FTE-2024', 'type' => 'mid-term', 'start_date' => '2024-07-15', 'end_date' => '2024-07-25', 'status' => 'completed'],
            ['name' => 'Second Term Exam', 'code' => 'STE-2024', 'type' => 'mid-term', 'start_date' => '2024-11-15', 'end_date' => '2024-11-25', 'status' => 'completed'],
            ['name' => 'Final Exam', 'code' => 'FE-2025', 'type' => 'final', 'start_date' => '2025-03-01', 'end_date' => '2025-03-15', 'status' => 'scheduled'],
            ['name' => 'Unit Test 1', 'code' => 'UT1-2024', 'type' => 'unit-test', 'start_date' => '2024-06-10', 'end_date' => '2024-06-10', 'status' => 'completed'],
            ['name' => 'Unit Test 2', 'code' => 'UT2-2024', 'type' => 'unit-test', 'start_date' => '2024-09-20', 'end_date' => '2024-09-20', 'status' => 'completed'],
        ];

        $exams = [];
        foreach ($examData as $data) {
            $exams[] = Exam::create([
                'academic_year_id' => $academicYear->id,
                'name' => $data['name'],
                'code' => $data['code'],
                'type' => $data['type'],
                'start_date' => $data['start_date'],
                'end_date' => $data['end_date'],
                'description' => 'Examination for ' . $data['name'],
                'publish_results' => ($data['status'] === 'completed'),
                'status' => $data['status'],
            ]);
        }

        $this->command->info('✓ 5 Exams created');

        // Create Grades for First Term Exam (all students, all subjects)
        $gradeCount = 0;
        $firstTermExam = $exams[0]; // First Term Exam

        foreach ($students as $student) {
            foreach ($subjects as $subject) {
                $marks = rand(30, 95);
                $grade = $this->calculateGrade($marks);
                $isPassed = $marks >= $subject->passing_marks;

                Grade::create([
                    'exam_id' => $firstTermExam->id,
                    'student_id' => $student->id,
                    'subject_id' => $subject->id,
                    'class_id' => $student->class_id,
                    'section_id' => $student->section_id,
                    'marks_obtained' => $marks,
                    'total_marks' => $subject->total_marks,
                    'grade' => $grade,
                    'remarks' => $isPassed ? 'Good performance' : 'Needs improvement',
                    'is_absent' => false,
                ]);
                $gradeCount++;
            }
        }

        $this->command->info("✓ {$gradeCount} Grades created for First Term Exam");

        // Create Fee Structures (for all classes)
        $feeTypes = [
            ['name' => 'Tuition Fee', 'type' => 'tuition', 'amount' => 15000, 'due_date' => '2024-04-30'],
            ['name' => 'Transport Fee', 'type' => 'transport', 'amount' => 5000, 'due_date' => '2024-04-30'],
            ['name' => 'Library Fee', 'type' => 'library', 'amount' => 1000, 'due_date' => '2024-05-15'],
            ['name' => 'Sports Fee', 'type' => 'sports', 'amount' => 2000, 'due_date' => '2024-05-15'],
            ['name' => 'Exam Fee', 'type' => 'exam', 'amount' => 1500, 'due_date' => '2024-07-01'],
        ];

        $feeCount = 0;
        foreach ($classes as $class) {
            foreach ($feeTypes as $feeData) {
                FeeStructure::create([
                    'academic_year_id' => $academicYear->id,
                    'class_id' => $class->id,
                    'name' => $feeData['name'],
                    'type' => $feeData['type'],
                    'amount' => $feeData['amount'],
                    'frequency' => 'yearly',
                    'due_date' => $feeData['due_date'],
                    'is_mandatory' => true,
                    'description' => $feeData['name'] . ' for ' . $class->name,
                    'status' => 'active',
                ]);
                $feeCount++;
            }
        }

        $this->command->info("✓ {$feeCount} Fee structures created");

        // Create Assignments (2 per subject per class)
        $assignmentCount = 0;
        foreach ($classes as $class) {
            // Find first section for this class
            $classSection = null;
            foreach ($sections as $section) {
                if ($section->class_id == $class->id) {
                    $classSection = $section;
                    break;
                }
            }

            foreach ($subjects as $subject) {
                for ($i = 1; $i <= 2; $i++) {
                    Assignment::create([
                        'class_id' => $class->id,
                        'section_id' => $classSection->id,
                        'subject_id' => $subject->id,
                        'teacher_id' => $teachers[array_rand($teachers)]->id,
                        'title' => $subject->name . ' Assignment ' . $i,
                        'description' => 'Complete the exercises from chapter ' . $i . ' and submit.',
                        'assigned_date' => Carbon::now()->subDays(rand(5, 30))->format('Y-m-d'),
                        'due_date' => Carbon::now()->addDays(rand(1, 15))->format('Y-m-d'),
                        'total_marks' => 20,
                        'status' => ['active', 'active', 'completed'][rand(0, 2)],
                    ]);
                    $assignmentCount++;
                }
            }
        }

        $this->command->info("✓ {$assignmentCount} Assignments created");

        $this->command->info('');
        $this->command->info('========================================');
        $this->command->info('✓ Comprehensive Test Data Seeding Complete!');
        $this->command->info('========================================');
        $this->command->info('Summary:');
        $this->command->info("- Academic Years: 1");
        $this->command->info("- Classes: 10");
        $this->command->info("- Sections: 30");
        $this->command->info("- Subjects: 8");
        $this->command->info("- Teachers: 15");
        $this->command->info("- Students: {$studentCount}");
        $this->command->info("- Attendance Records: {$attendanceCount}");
        $this->command->info("- Exams: 5");
        $this->command->info("- Grades: {$gradeCount}");
        $this->command->info("- Fee Structures: {$feeCount}");
        $this->command->info("- Assignments: {$assignmentCount}");
        $this->command->info('========================================');
        $this->command->info('');
        $this->command->info('Login Credentials:');
        $this->command->info('- Admin: admin@school.com / password');
        $this->command->info('- Teachers: rajesh.kumar@school.com / password (and 14 more)');
        $this->command->info('- Students: aarav.kumar1@student.com / password (and 899 more)');
        $this->command->info('========================================');
    }

    private function calculateGrade($marks)
    {
        if ($marks >= 90) return 'A+';
        if ($marks >= 80) return 'A';
        if ($marks >= 70) return 'B+';
        if ($marks >= 60) return 'B';
        if ($marks >= 50) return 'C+';
        if ($marks >= 40) return 'C';
        return 'F';
    }
}

