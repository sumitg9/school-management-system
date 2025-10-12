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

class TestDataSeeder extends Seeder
{
    public function run()
    {
        $this->command->info('Creating test data...');

        // Create Academic Year
        $academicYear = AcademicYear::create([
            'name' => '2024-2025',
            'start_date' => '2024-04-01',
            'end_date' => '2025-03-31',
            'is_current' => true,
        ]);

        $this->command->info('✓ Academic Year created');

        // Create Classes
        $classes = [];
        for ($i = 1; $i <= 10; $i++) {
            $classes[] = ClassModel::create([
                'name' => "Class {$i}",
                'numeric_name' => (string)$i,
                'order' => $i,
                'description' => "Class {$i} - Academic Year {$academicYear->name}",
                'status' => 'active',
            ]);
        }

        $this->command->info('✓ 10 Classes created');

        // Create Sections for each class
        $sections = [];
        $sectionNames = ['A', 'B', 'C'];
        foreach ($classes as $class) {
            foreach ($sectionNames as $sectionName) {
                $sections[] = Section::create([
                    'name' => $sectionName,
                    'class_id' => $class->id,
                    'capacity' => 40,
                ]);
            }
        }

        $this->command->info('✓ 30 Sections created (3 per class)');

        // Create Subjects
        $subjectData = [
            ['name' => 'Mathematics', 'code' => 'MATH', 'type' => 'theory', 'total_marks' => 100, 'passing_marks' => 40, 'description' => 'Core Mathematics'],
            ['name' => 'English', 'code' => 'ENG', 'type' => 'theory', 'total_marks' => 100, 'passing_marks' => 40, 'description' => 'English Language and Literature'],
            ['name' => 'Science', 'code' => 'SCI', 'type' => 'both', 'total_marks' => 100, 'passing_marks' => 40, 'description' => 'General Science with Practical'],
            ['name' => 'Social Studies', 'code' => 'SST', 'type' => 'theory', 'total_marks' => 100, 'passing_marks' => 40, 'description' => 'Social Studies'],
            ['name' => 'Hindi', 'code' => 'HIN', 'type' => 'theory', 'total_marks' => 100, 'passing_marks' => 40, 'description' => 'Hindi Language'],
            ['name' => 'Computer Science', 'code' => 'CS', 'type' => 'both', 'total_marks' => 100, 'passing_marks' => 40, 'description' => 'Computer Science with Lab'],
            ['name' => 'Physical Education', 'code' => 'PE', 'type' => 'practical', 'total_marks' => 50, 'passing_marks' => 20, 'description' => 'Physical Education'],
            ['name' => 'Art', 'code' => 'ART', 'type' => 'practical', 'total_marks' => 50, 'passing_marks' => 20, 'description' => 'Art and Craft'],
        ];

        $subjects = [];
        foreach ($subjectData as $data) {
            $data['status'] = 'active';
            $subjects[] = Subject::create($data);
        }

        $this->command->info('✓ 8 Subjects created');

        // Create Teachers
        $teacherData = [
            ['first_name' => 'Rajesh', 'last_name' => 'Kumar', 'email' => 'rajesh.kumar@school.com', 'phone' => '9876543210', 'gender' => 'male', 'department' => 'Mathematics', 'employment_type' => 'permanent', 'status' => 'active'],
            ['first_name' => 'Priya', 'last_name' => 'Sharma', 'email' => 'priya.sharma@school.com', 'phone' => '9876543211', 'gender' => 'female', 'department' => 'English', 'employment_type' => 'permanent', 'status' => 'active'],
            ['first_name' => 'Amit', 'last_name' => 'Patel', 'email' => 'amit.patel@school.com', 'phone' => '9876543212', 'gender' => 'male', 'department' => 'Science', 'employment_type' => 'permanent', 'status' => 'active'],
            ['first_name' => 'Sunita', 'last_name' => 'Verma', 'email' => 'sunita.verma@school.com', 'phone' => '9876543213', 'gender' => 'female', 'department' => 'Social Studies', 'employment_type' => 'permanent', 'status' => 'active'],
            ['first_name' => 'Vikram', 'last_name' => 'Singh', 'email' => 'vikram.singh@school.com', 'phone' => '9876543214', 'gender' => 'male', 'department' => 'Hindi', 'employment_type' => 'contract', 'status' => 'active'],
            ['first_name' => 'Anjali', 'last_name' => 'Gupta', 'email' => 'anjali.gupta@school.com', 'phone' => '9876543215', 'gender' => 'female', 'department' => 'Computer Science', 'employment_type' => 'permanent', 'status' => 'active'],
            ['first_name' => 'Rahul', 'last_name' => 'Mehta', 'email' => 'rahul.mehta@school.com', 'phone' => '9876543216', 'gender' => 'male', 'department' => 'Physical Education', 'employment_type' => 'contract', 'status' => 'active'],
            ['first_name' => 'Neha', 'last_name' => 'Reddy', 'email' => 'neha.reddy@school.com', 'phone' => '9876543217', 'gender' => 'female', 'department' => 'Art', 'employment_type' => 'part-time', 'status' => 'active'],
            ['first_name' => 'Suresh', 'last_name' => 'Rao', 'email' => 'suresh.rao@school.com', 'phone' => '9876543218', 'gender' => 'male', 'department' => 'Mathematics', 'employment_type' => 'permanent', 'status' => 'active'],
            ['first_name' => 'Kavita', 'last_name' => 'Joshi', 'email' => 'kavita.joshi@school.com', 'phone' => '9876543219', 'gender' => 'female', 'department' => 'English', 'employment_type' => 'permanent', 'status' => 'active'],
        ];

        $teachers = [];
        $teacherCount = 1;
        foreach ($teacherData as $data) {
            // Create user first
            $user = \App\Models\User::create([
                'name' => $data['first_name'] . ' ' . $data['last_name'],
                'email' => $data['email'],
                'password' => bcrypt('password'),
                'phone' => $data['phone'],
                'gender' => $data['gender'],
                'date_of_birth' => Carbon::now()->subYears(rand(28, 45))->format('Y-m-d'),
                'address' => 'Teacher Address, City',
            ]);

            // Assign teacher role
            $user->assignRole('teacher');

            // Create teacher record
            $teacher = Teacher::create([
                'user_id' => $user->id,
                'employee_id' => 'TCH' . str_pad($teacherCount, 4, '0', STR_PAD_LEFT),
                'first_name' => $data['first_name'],
                'last_name' => $data['last_name'],
                'joining_date' => Carbon::now()->subYears(rand(1, 10))->format('Y-m-d'),
                'qualification' => ['B.Ed', 'M.Ed', 'M.A.', 'M.Sc.'][rand(0, 3)],
                'experience_years' => rand(1, 15),
                'department' => $data['department'],
                'salary' => rand(30000, 80000),
                'employment_type' => $data['employment_type'],
                'status' => 'active',
            ]);

            $teachers[] = $teacher;
            $teacherCount++;
        }

        $this->command->info('✓ 10 Teachers created');

        // Create Students
        $firstNames = ['Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Arnav', 'Ayaan', 'Krishna', 'Ishaan',
                       'Ananya', 'Diya', 'Aadhya', 'Saanvi', 'Kiara', 'Anika', 'Navya', 'Angel', 'Pari', 'Myra'];
        $lastNames = ['Kumar', 'Sharma', 'Patel', 'Singh', 'Verma', 'Gupta', 'Reddy', 'Rao', 'Mehta', 'Joshi'];

        $students = [];
        $studentCount = 0;

        foreach ($sections as $section) {
            $studentsPerSection = rand(25, 35);
            for ($i = 0; $i < $studentsPerSection; $i++) {
                $studentCount++;
                $firstName = $firstNames[array_rand($firstNames)];
                $lastName = $lastNames[array_rand($lastNames)];

                // Create user first
                $user = \App\Models\User::create([
                    'name' => $firstName . ' ' . $lastName,
                    'email' => strtolower($firstName . '.' . $lastName . $studentCount . '@student.com'),
                    'password' => bcrypt('password'),
                    'phone' => '98765' . str_pad($studentCount, 5, '0', STR_PAD_LEFT),
                    'gender' => ['male', 'female'][rand(0, 1)],
                    'date_of_birth' => Carbon::now()->subYears(rand(6, 16))->format('Y-m-d'),
                    'address' => rand(1, 999) . ' Main Street, Mumbai, Maharashtra',
                ]);

                // Assign student role
                $user->assignRole('student');

                // Create student record
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

        // Create Attendance Records (last 30 days)
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
                    Attendance::create([
                        'student_id' => $student->id,
                        'class_id' => $student->class_id,
                        'section_id' => $student->section_id,
                        'date' => $date,
                        'status' => ['absent', 'excused'][rand(0, 1)],
                        'remarks' => ['Sick', 'Family emergency', 'Medical appointment'][rand(0, 2)],
                    ]);
                    $attendanceCount++;
                }
            }
        }

        $this->command->info("✓ {$attendanceCount} Attendance records created (30 days)");

        // Create Exams
        $examData = [
            ['name' => 'First Term Exam', 'code' => 'FTE-2024', 'type' => 'mid-term', 'start_date' => '2024-07-15', 'end_date' => '2024-07-25', 'status' => 'completed'],
            ['name' => 'Second Term Exam', 'code' => 'STE-2024', 'type' => 'mid-term', 'start_date' => '2024-11-15', 'end_date' => '2024-11-25', 'status' => 'completed'],
            ['name' => 'Final Exam', 'code' => 'FE-2025', 'type' => 'final', 'start_date' => '2025-03-01', 'end_date' => '2025-03-15', 'status' => 'scheduled'],
            ['name' => 'Math Quiz 1', 'code' => 'MQ1-2024', 'type' => 'unit-test', 'start_date' => '2024-06-10', 'end_date' => '2024-06-10', 'status' => 'completed'],
            ['name' => 'Science Practical', 'code' => 'SP-2024', 'type' => 'other', 'start_date' => '2024-08-20', 'end_date' => '2024-08-22', 'status' => 'completed'],
        ];

        $exams = [];
        foreach ($examData as $data) {
            $data['academic_year_id'] = $academicYear->id;
            $data['description'] = 'Examination for ' . $data['name'];
            $data['publish_results'] = in_array($data['status'], ['completed']) ? true : false;
            $exams[] = Exam::create($data);
        }

        $this->command->info('✓ 5 Exams created');

        // Create Grades for first exam
        $gradeCount = 0;
        $firstExam = $exams[0];
        foreach ($students as $student) {
            foreach ($subjects as $subject) {
                $marksObtained = rand(30, 95);
                Grade::create([
                    'exam_id' => $firstExam->id,
                    'student_id' => $student->id,
                    'subject_id' => $subject->id,
                    'marks_obtained' => $marksObtained,
                    'total_marks' => $subject->total_marks,
                    'grade' => $this->calculateGrade($marksObtained),
                    'remarks' => $marksObtained >= $subject->passing_marks ? 'Pass' : 'Fail',
                ]);
                $gradeCount++;
            }
        }

        $this->command->info("✓ {$gradeCount} Grades created for First Term Exam");

        // Create Fee Structures (for each class)
        $feeData = [
            ['name' => 'Tuition Fee', 'type' => 'tuition', 'amount' => 15000, 'due_date' => '2024-04-30', 'frequency' => 'yearly'],
            ['name' => 'Transport Fee', 'type' => 'transport', 'amount' => 5000, 'due_date' => '2024-04-30', 'frequency' => 'yearly'],
            ['name' => 'Library Fee', 'type' => 'library', 'amount' => 1000, 'due_date' => '2024-05-15', 'frequency' => 'yearly'],
            ['name' => 'Sports Fee', 'type' => 'sports', 'amount' => 2000, 'due_date' => '2024-05-15', 'frequency' => 'yearly'],
            ['name' => 'Exam Fee', 'type' => 'exam', 'amount' => 1500, 'due_date' => '2024-07-01', 'frequency' => 'yearly'],
        ];

        $feeCount = 0;
        // Create fee structures for first 3 classes only (to keep it manageable)
        foreach (array_slice($classes, 0, 3) as $class) {
            foreach ($feeData as $data) {
                $data['academic_year_id'] = $academicYear->id;
                $data['class_id'] = $class->id;
                $data['description'] = 'Annual ' . $data['name'] . ' for ' . $class->name;
                $data['is_mandatory'] = true;
                $data['status'] = 'active';
                FeeStructure::create($data);
                $feeCount++;
            }
        }

        $this->command->info("✓ {$feeCount} Fee structures created");

        // Create Assignments
        $assignmentCount = 0;
        foreach ($classes as $class) {
            foreach ($sections as $section) {
                if ($section->class_id == $class->id) {
                    foreach ($subjects as $subject) {
                        for ($i = 1; $i <= 2; $i++) {
                            Assignment::create([
                                'class_id' => $class->id,
                                'section_id' => $section->id,
                                'subject_id' => $subject->id,
                                'title' => $subject->name . ' Assignment ' . $i,
                                'description' => 'Complete exercises from Chapter ' . $i . ' and submit.',
                                'due_date' => Carbon::now()->addDays(rand(5, 30))->format('Y-m-d'),
                                'total_marks' => 20,
                            ]);
                            $assignmentCount++;
                        }
                    }
                    break; // Only one section per class for assignments
                }
            }
        }

        $this->command->info("✓ {$assignmentCount} Assignments created");

        $this->command->info('');
        $this->command->info('========================================');
        $this->command->info('✓ Test Data Seeding Complete!');
        $this->command->info('========================================');
        $this->command->info('Summary:');
        $this->command->info("- Academic Years: 1");
        $this->command->info("- Classes: 10");
        $this->command->info("- Sections: 30");
        $this->command->info("- Subjects: 8");
        $this->command->info("- Teachers: 10");
        $this->command->info("- Students: {$studentCount}");
        $this->command->info("- Attendance Records: {$attendanceCount}");
        $this->command->info("- Exams: 5");
        $this->command->info("- Grades: {$gradeCount}");
        $this->command->info("- Fee Structures: {$feeCount}");
        $this->command->info("- Assignments: {$assignmentCount}");
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

