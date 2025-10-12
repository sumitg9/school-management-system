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

class SimpleTestDataSeeder extends Seeder
{
    public function run(): void
    {
        $this->command->info('Creating simple test data...');

        // Create Academic Year
        $academicYear = AcademicYear::create([
            'name' => '2024-2025',
            'start_date' => '2024-04-01',
            'end_date' => '2025-03-31',
            'is_current' => true,
            'status' => 'active',
        ]);

        $this->command->info('✓ Academic Year created');

        // Create 3 Classes
        $classes = [];
        for ($i = 1; $i <= 3; $i++) {
            $classes[] = ClassModel::create([
                'name' => "Class {$i}",
                'numeric_name' => (string)$i,
                'order' => $i,
                'description' => "Class {$i}",
                'status' => 'active',
            ]);
        }

        $this->command->info('✓ 3 Classes created');

        // Create Sections (1 per class)
        $sections = [];
        foreach ($classes as $class) {
            $sections[] = Section::create([
                'class_id' => $class->id,
                'name' => 'A',
                'capacity' => 40,
                'status' => 'active',
            ]);
        }

        $this->command->info('✓ 3 Sections created');

        // Create 3 Subjects
        $subjectData = [
            ['name' => 'Mathematics', 'code' => 'MATH', 'type' => 'theory'],
            ['name' => 'English', 'code' => 'ENG', 'type' => 'theory'],
            ['name' => 'Science', 'code' => 'SCI', 'type' => 'both'],
        ];

        $subjects = [];
        foreach ($subjectData as $data) {
            $subjects[] = Subject::create([
                'name' => $data['name'],
                'code' => $data['code'],
                'type' => $data['type'],
                'total_marks' => 100,
                'passing_marks' => 40,
                'description' => $data['name'] . ' subject',
                'status' => 'active',
            ]);
        }

        $this->command->info('✓ 3 Subjects created');

        // Create 3 Teachers
        $teacherData = [
            ['first_name' => 'Rajesh', 'last_name' => 'Kumar', 'email' => 'rajesh.kumar@school.com', 'department' => 'Mathematics'],
            ['first_name' => 'Priya', 'last_name' => 'Sharma', 'email' => 'priya.sharma@school.com', 'department' => 'English'],
            ['first_name' => 'Amit', 'last_name' => 'Patel', 'email' => 'amit.patel@school.com', 'department' => 'Science'],
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
                'gender' => 'male',
                'date_of_birth' => '1985-01-01',
                'address' => 'Teacher Address',
            ]);
            
            $user->assignRole('teacher');
            
            // Create teacher
            $teacher = Teacher::create([
                'user_id' => $user->id,
                'employee_id' => 'TCH' . str_pad($teacherCount, 4, '0', STR_PAD_LEFT),
                'first_name' => $data['first_name'],
                'last_name' => $data['last_name'],
                'joining_date' => now()->subYears(2),
                'qualification' => 'M.Ed',
                'experience_years' => 5,
                'department' => $data['department'],
                'salary' => 50000,
                'employment_type' => 'full-time',
                'status' => 'active',
            ]);
            
            $teachers[] = $teacher;
            $teacherCount++;
        }

        $this->command->info('✓ 3 Teachers created');

        // Create 30 Students (10 per section)
        $firstNames = ['Aarav', 'Vivaan', 'Aditya', 'Ananya', 'Diya', 'Saanvi', 'Arjun', 'Kiara', 'Vihaan', 'Navya'];
        $lastNames = ['Kumar', 'Sharma', 'Patel'];

        $students = [];
        $studentCount = 0;

        foreach ($sections as $section) {
            for ($i = 0; $i < 10; $i++) {
                $studentCount++;
                $firstName = $firstNames[$i];
                $lastName = $lastNames[array_rand($lastNames)];

                // Create user
                $user = \App\Models\User::create([
                    'name' => $firstName . ' ' . $lastName,
                    'email' => strtolower($firstName . '.' . $lastName . $studentCount . '@student.com'),
                    'password' => bcrypt('password'),
                    'phone' => '98765' . str_pad($studentCount, 5, '0', STR_PAD_LEFT),
                    'gender' => ($i % 2 == 0) ? 'male' : 'female',
                    'date_of_birth' => Carbon::now()->subYears(10)->format('Y-m-d'),
                    'address' => 'Student Address',
                ]);
                
                $user->assignRole('student');
                
                // Create student
                $student = Student::create([
                    'user_id' => $user->id,
                    'academic_year_id' => $academicYear->id,
                    'class_id' => $section->class_id,
                    'section_id' => $section->id,
                    'admission_number' => 'STU' . str_pad($studentCount, 4, '0', STR_PAD_LEFT),
                    'admission_date' => now()->subMonths(6),
                    'first_name' => $firstName,
                    'last_name' => $lastName,
                    'roll_number' => ($i + 1),
                    'blood_group' => 'O+',
                    'nationality' => 'Indian',
                    'status' => 'active',
                ]);
                
                $students[] = $student;
            }
        }

        $this->command->info("✓ {$studentCount} Students created");

        // Create 1 Exam
        $exam = Exam::create([
            'academic_year_id' => $academicYear->id,
            'name' => 'First Term Exam',
            'code' => 'FTE-2024',
            'type' => 'mid-term',
            'start_date' => '2024-07-15',
            'end_date' => '2024-07-25',
            'description' => 'First Term Examination',
            'publish_results' => true,
            'status' => 'completed',
        ]);

        $this->command->info('✓ 1 Exam created');

        // Create Fee Structures (for first class only)
        $feeCount = 0;
        $feeTypes = [
            ['name' => 'Tuition Fee', 'type' => 'tuition', 'amount' => 15000],
            ['name' => 'Transport Fee', 'type' => 'transport', 'amount' => 5000],
        ];

        foreach ($feeTypes as $feeData) {
            FeeStructure::create([
                'academic_year_id' => $academicYear->id,
                'class_id' => $classes[0]->id,
                'name' => $feeData['name'],
                'type' => $feeData['type'],
                'amount' => $feeData['amount'],
                'frequency' => 'yearly',
                'due_date' => '2024-04-30',
                'is_mandatory' => true,
                'description' => $feeData['name'],
                'status' => 'active',
            ]);
            $feeCount++;
        }

        $this->command->info("✓ {$feeCount} Fee structures created");

        $this->command->info('');
        $this->command->info('========================================');
        $this->command->info('✓ Simple Test Data Seeding Complete!');
        $this->command->info('========================================');
        $this->command->info('Summary:');
        $this->command->info("- Academic Years: 1");
        $this->command->info("- Classes: 3");
        $this->command->info("- Sections: 3");
        $this->command->info("- Subjects: 3");
        $this->command->info("- Teachers: 3");
        $this->command->info("- Students: {$studentCount}");
        $this->command->info("- Exams: 1");
        $this->command->info("- Fee Structures: {$feeCount}");
        $this->command->info('========================================');
    }
}

