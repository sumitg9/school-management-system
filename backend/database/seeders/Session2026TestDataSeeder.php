<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\AcademicYear;
use App\Models\ClassModel;
use App\Models\Section;
use App\Models\Subject;
use App\Models\Student;
use App\Models\Teacher;
use App\Models\User;
use App\Models\FeeStructure;
use App\Models\FeePayment;
use App\Models\Attendance;
use App\Models\Exam;
use App\Models\Grade;
use App\Models\Assignment;
use Carbon\Carbon;

class Session2026TestDataSeeder extends Seeder
{
    public function run(): void
    {
        $this->command->info('=== Seeding Dummy Data for Academic Session 2026-2027 ===');

        // 1. Create or Update Academic Year 2026-2027
        AcademicYear::where('is_current', true)->update(['is_current' => false]);

        $academicYear = AcademicYear::firstOrNew(['name' => '2026-2027']);
        $academicYear->name = '2026-2027';
        $academicYear->start_date = '2026-04-01';
        $academicYear->end_date = '2027-03-31';
        $academicYear->is_current = true;
        $academicYear->status = 'active';
        $academicYear->description = 'Academic Session 2026-2027 (Current)';
        $academicYear->save();

        $this->command->info("✓ Academic Year 2026-2027 set as CURRENT (ID: {$academicYear->id})");

        // 2. Fetch or Create Classes
        $classes = [];
        for ($i = 1; $i <= 10; $i++) {
            $class = ClassModel::firstOrCreate(
                ['numeric_name' => (string)$i],
                [
                    'name' => "Class {$i}",
                    'order' => $i,
                    'description' => "Standard {$i}",
                    'status' => 'active',
                ]
            );
            $classes[$i] = $class;
        }

        // Fetch or Create Sections A, B for Classes 1 to 5
        $sections = [];
        foreach ([1, 2, 3, 4, 5] as $cNum) {
            $class = $classes[$cNum];
            foreach (['A', 'B'] as $secName) {
                $section = Section::firstOrCreate(
                    ['class_id' => $class->id, 'name' => $secName],
                    [
                        'capacity' => 40,
                        'current_strength' => 0,
                        'status' => 'active',
                    ]
                );
                $sections["{$cNum}-{$secName}"] = $section;
            }
        }
        $this->command->info("✓ Classes and Sections verified");

        // 3. Create or Fetch Subjects
        $subjectDefs = [
            ['name' => 'Mathematics', 'code' => 'MATH', 'type' => 'theory', 'total_marks' => 100, 'passing_marks' => 40],
            ['name' => 'English', 'code' => 'ENG', 'type' => 'theory', 'total_marks' => 100, 'passing_marks' => 40],
            ['name' => 'Science', 'code' => 'SCI', 'type' => 'both', 'total_marks' => 100, 'passing_marks' => 40],
            ['name' => 'Social Studies', 'code' => 'SST', 'type' => 'theory', 'total_marks' => 100, 'passing_marks' => 40],
            ['name' => 'Computer Science', 'code' => 'CS', 'type' => 'both', 'total_marks' => 100, 'passing_marks' => 40],
            ['name' => 'Hindi', 'code' => 'HIN', 'type' => 'theory', 'total_marks' => 100, 'passing_marks' => 40],
        ];
        $subjects = [];
        foreach ($subjectDefs as $sDef) {
            $subjects[$sDef['code']] = Subject::firstOrCreate(
                ['code' => $sDef['code']],
                array_merge($sDef, ['status' => 'active'])
            );
        }

        // 4. Create Fee Structures for Academic Year 2026-2027
        // Valid types: tuition, transport, library, sports, exam, other
        $feeConfigs = [
            // Class 1
            [
                'class_num' => 1,
                'items' => [
                    ['name' => 'Tuition Fee', 'type' => 'tuition', 'amount' => 2500, 'frequency' => 'monthly', 'is_mandatory' => true, 'description' => 'Regular monthly tuition fee'],
                    ['name' => 'Computer & Lab Fee', 'type' => 'other', 'amount' => 500, 'frequency' => 'monthly', 'is_mandatory' => true, 'description' => 'Computer lab and digital learning'],
                    ['name' => 'Transport Facility Fee', 'type' => 'transport', 'amount' => 1200, 'frequency' => 'monthly', 'is_mandatory' => false, 'description' => 'School bus transport fee'],
                    ['name' => 'Annual Development Fee', 'type' => 'other', 'amount' => 3000, 'frequency' => 'one-time', 'is_mandatory' => true, 'description' => 'One-time session development & activity fee'],
                ],
            ],
            // Class 2
            [
                'class_num' => 2,
                'items' => [
                    ['name' => 'Tuition Fee', 'type' => 'tuition', 'amount' => 2800, 'frequency' => 'monthly', 'is_mandatory' => true, 'description' => 'Regular monthly tuition fee'],
                    ['name' => 'Computer Lab Fee', 'type' => 'other', 'amount' => 600, 'frequency' => 'monthly', 'is_mandatory' => true, 'description' => 'IT & multimedia lab access'],
                    ['name' => 'Library & Activity Fee', 'type' => 'library', 'amount' => 1500, 'frequency' => 'one-time', 'is_mandatory' => true, 'description' => 'Annual library charges & events'],
                ],
            ],
            // Class 3
            [
                'class_num' => 3,
                'items' => [
                    ['name' => 'Tuition Fee', 'type' => 'tuition', 'amount' => 3000, 'frequency' => 'monthly', 'is_mandatory' => true, 'description' => 'Monthly academic tuition charge'],
                    ['name' => 'STEM & Robotics Lab', 'type' => 'other', 'amount' => 700, 'frequency' => 'monthly', 'is_mandatory' => true, 'description' => 'Practical science & robotics lab'],
                ],
            ],
            // Class 5
            [
                'class_num' => 5,
                'items' => [
                    ['name' => 'Tuition Fee', 'type' => 'tuition', 'amount' => 3500, 'frequency' => 'monthly', 'is_mandatory' => true, 'description' => 'Senior primary monthly tuition charge'],
                    ['name' => 'Smart Classroom & Lab', 'type' => 'other', 'amount' => 800, 'frequency' => 'monthly', 'is_mandatory' => true, 'description' => 'Digital interactive class & computer lab'],
                    ['name' => 'Sports & Physical Ed', 'type' => 'sports', 'amount' => 500, 'frequency' => 'monthly', 'is_mandatory' => false, 'description' => 'Sports coaching and equipment fee'],
                ],
            ],
        ];

        $feeStructures = [];
        $createdFeeCount = 0;
        foreach ($feeConfigs as $cfg) {
            $class = $classes[$cfg['class_num']];
            foreach ($cfg['items'] as $item) {
                $fs = FeeStructure::firstOrCreate(
                    [
                        'academic_year_id' => $academicYear->id,
                        'class_id' => $class->id,
                        'name' => $item['name'],
                    ],
                    [
                        'type' => $item['type'],
                        'amount' => $item['amount'],
                        'frequency' => $item['frequency'],
                        'is_mandatory' => $item['is_mandatory'],
                        'description' => $item['description'],
                        'status' => 'active',
                    ]
                );
                $feeStructures["{$cfg['class_num']}_{$item['name']}"] = $fs;
                $createdFeeCount++;
            }
        }
        $this->command->info("✓ Created {$createdFeeCount} Fee Structures for 2026-2027 session");

        // 5. Create Students with Varied Testing Scenarios
        $studentsToCreate = [
            [
                'first_name' => 'Aarav',
                'last_name' => 'Sharma',
                'gender' => 'male',
                'email' => 'aarav.sharma2026@school.com',
                'adm_no' => 'ADM-2026-001',
                'class_num' => 1,
                'section' => 'A',
                'roll' => 1,
                'dob' => '2019-05-14',
                'scenario' => 'unpaid', // Completely unpaid: Apr to Nov 2026 due (8 months overdue)
            ],
            [
                'first_name' => 'Diya',
                'last_name' => 'Patel',
                'gender' => 'female',
                'email' => 'diya.patel2026@school.com',
                'adm_no' => 'ADM-2026-002',
                'class_num' => 1,
                'section' => 'A',
                'roll' => 2,
                'dob' => '2019-08-22',
                'scenario' => 'paid_up_to_august', // Paid Apr to Aug; Sep, Oct, Nov due (3 months overdue with late fine)
            ],
            [
                'first_name' => 'Rohan',
                'last_name' => 'Gupta',
                'gender' => 'male',
                'email' => 'rohan.gupta2026@school.com',
                'adm_no' => 'ADM-2026-003',
                'class_num' => 1,
                'section' => 'A',
                'roll' => 3,
                'dob' => '2019-11-03',
                'scenario' => 'paid_up_to_october', // Paid Apr to Oct; Only Nov due (1 month overdue)
            ],
            [
                'first_name' => 'Ananya',
                'last_name' => 'Singh',
                'gender' => 'female',
                'email' => 'ananya.singh2026@school.com',
                'adm_no' => 'ADM-2026-004',
                'class_num' => 1,
                'section' => 'B',
                'roll' => 1,
                'dob' => '2019-03-29',
                'scenario' => 'paid_up_to_current', // Paid Apr to Nov; 0 dues, Dec 2026 next advance
            ],
            [
                'first_name' => 'Kabir',
                'last_name' => 'Mehta',
                'gender' => 'male',
                'email' => 'kabir.mehta2026@school.com',
                'adm_no' => 'ADM-2026-005',
                'class_num' => 2,
                'section' => 'A',
                'roll' => 1,
                'dob' => '2018-06-12',
                'scenario' => 'fully_paid', // Paid all 12 months (Apr 2026 to Mar 2027)
            ],
            [
                'first_name' => 'Ishaan',
                'last_name' => 'Verma',
                'gender' => 'male',
                'email' => 'ishaan.verma2026@school.com',
                'adm_no' => 'ADM-2026-006',
                'class_num' => 2,
                'section' => 'A',
                'roll' => 2,
                'dob' => '2018-09-18',
                'scenario' => 'paid_quarter_1', // Paid Apr, May, Jun; Jul to Nov due (5 months overdue)
            ],
            [
                'first_name' => 'Saanvi',
                'last_name' => 'Nair',
                'gender' => 'female',
                'email' => 'saanvi.nair2026@school.com',
                'adm_no' => 'ADM-2026-007',
                'class_num' => 3,
                'section' => 'A',
                'roll' => 1,
                'dob' => '2017-04-10',
                'scenario' => 'paid_up_to_september', // Paid Apr to Sep; Oct & Nov due (2 months overdue)
            ],
            [
                'first_name' => 'Vivaan',
                'last_name' => 'Joshi',
                'gender' => 'male',
                'email' => 'vivaan.joshi2026@school.com',
                'adm_no' => 'ADM-2026-008',
                'class_num' => 5,
                'section' => 'A',
                'roll' => 1,
                'dob' => '2015-12-05',
                'scenario' => 'unpaid', // Completely unpaid Class 5 student
            ],
        ];

        $createdStudents = [];
        foreach ($studentsToCreate as $sData) {
            $user = User::firstOrCreate(
                ['email' => $sData['email']],
                [
                    'name' => "{$sData['first_name']} {$sData['last_name']}",
                    'password' => bcrypt('password123'),
                    'phone' => '98' . rand(10000000, 99999999),
                    'gender' => $sData['gender'],
                    'date_of_birth' => $sData['dob'],
                    'address' => '42 Heritage Enclave, Model Town',
                    'status' => 'active',
                ]
            );

            $classObj = $classes[$sData['class_num']];
            $secObj = $sections["{$sData['class_num']}-{$sData['section']}"];

            $student = Student::firstOrNew(['admission_number' => $sData['adm_no']]);
            $student->user_id = $user->id;
            $student->academic_year_id = $academicYear->id;
            $student->class_id = $classObj->id;
            $student->section_id = $secObj->id;
            $student->admission_date = '2026-04-01';
            $student->first_name = $sData['first_name'];
            $student->last_name = $sData['last_name'];
            $student->roll_number = $sData['roll'];
            $student->blood_group = 'O+';
            $student->nationality = 'Indian';
            $student->status = 'active';
            $student->emergency_contact_name = "Mr. {$sData['last_name']}";
            $student->emergency_contact_phone = '9876543210';
            $student->emergency_contact_relation = 'Father';
            $student->save();

            $createdStudents[$sData['adm_no']] = [
                'student' => $student,
                'scenario' => $sData['scenario'],
                'class_num' => $sData['class_num'],
            ];
        }
        $this->command->info("✓ Created " . count($createdStudents) . " Students for 2026-2027");

        // 6. Seed Specific Payment Histories for the Scenarios
        $adminUser = User::where('email', 'like', '%admin%')->first() ?: User::first();
        $adminId = $adminUser ? $adminUser->id : null;

        $sessionMonthsList = [
            ['name' => 'April 2026', 'short' => "Apr '26", 'date' => '2026-04-08'],
            ['name' => 'May 2026', 'short' => "May '26", 'date' => '2026-05-09'],
            ['name' => 'June 2026', 'short' => "Jun '26", 'date' => '2026-06-08'],
            ['name' => 'July 2026', 'short' => "Jul '26", 'date' => '2026-07-09'],
            ['name' => 'August 2026', 'short' => "Aug '26", 'date' => '2026-08-08'],
            ['name' => 'September 2026', 'short' => "Sep '26", 'date' => '2026-09-09'],
            ['name' => 'October 2026', 'short' => "Oct '26", 'date' => '2026-10-08'],
            ['name' => 'November 2026', 'short' => "Nov '26", 'date' => '2026-11-09'],
            ['name' => 'December 2026', 'short' => "Dec '26", 'date' => '2026-11-10'],
            ['name' => 'January 2027', 'short' => "Jan '27", 'date' => '2026-11-10'],
            ['name' => 'February 2027', 'short' => "Feb '27", 'date' => '2026-11-10'],
            ['name' => 'March 2027', 'short' => "Mar '27", 'date' => '2026-11-10'],
        ];

        $seedTime = time();

        foreach ($createdStudents as $admNo => $info) {
            $student = $info['student'];
            $scenario = $info['scenario'];
            $classNum = $info['class_num'];
            $tuitionStruct = $feeStructures["{$classNum}_Tuition Fee"] ?? null;

            if (!$tuitionStruct) continue;

            $monthsToPay = 0;
            if ($scenario === 'paid_up_to_august') {
                $monthsToPay = 5; // Apr to Aug
            } elseif ($scenario === 'paid_up_to_october') {
                $monthsToPay = 7; // Apr to Oct
            } elseif ($scenario === 'paid_up_to_current') {
                $monthsToPay = 8; // Apr to Nov (Current Month)
            } elseif ($scenario === 'fully_paid') {
                $monthsToPay = 12; // All 12 months
            } elseif ($scenario === 'paid_quarter_1') {
                $monthsToPay = 3; // Apr, May, Jun
            } elseif ($scenario === 'paid_up_to_september') {
                $monthsToPay = 6; // Apr to Sep
            }

            if ($monthsToPay > 0) {
                // Delete previous payments for this student
                FeePayment::where('student_id', $student->id)->forceDelete();

                // Group into chunks of 2-3 months per receipt
                $chunkSize = 2;
                $chunks = array_chunk(array_slice($sessionMonthsList, 0, $monthsToPay), $chunkSize);

                foreach ($chunks as $cIdx => $mChunk) {
                    $mNames = array_column($mChunk, 'name');
                    $mCount = count($mNames);
                    $subtotal = $tuitionStruct->amount * $mCount;
                    $payDate = $mChunk[0]['date'];
                    $rcpNum = 'RCP-2026-' . $student->id . '-' . ($cIdx + 1) . '-' . substr($seedTime, -4);
                    $desc = "Fee payment for " . implode(', ', $mNames) . " ({$mCount} Month" . ($mCount > 1 ? 's' : '') . ")";

                    FeePayment::create([
                        'student_id' => $student->id,
                        'fee_structure_id' => $tuitionStruct->id,
                        'receipt_number' => $rcpNum,
                        'amount' => $subtotal,
                        'discount' => 0,
                        'fine' => 0,
                        'total_amount' => $subtotal,
                        'payment_date' => $payDate,
                        'payment_method' => ['cash', 'card', 'online', 'bank-transfer'][$cIdx % 4],
                        'transaction_id' => 'TXN2026' . rand(100000, 999999),
                        'remarks' => $desc,
                        'status' => 'completed',
                        'collected_by' => $adminId,
                    ]);
                }
            }
        }
        $this->command->info("✓ Seeded realistic payment histories for test scenarios");

        // 7. Seed Attendance for Recent School Days in November 2026
        $attendanceCount = 0;
        for ($day = 1; $day <= 14; $day++) {
            $attDate = sprintf('2026-11-%02d', $day);
            $dayOfWeek = Carbon::parse($attDate)->dayOfWeek;
            if ($dayOfWeek === Carbon::SUNDAY) continue;

            foreach ($createdStudents as $info) {
                $student = $info['student'];
                $isLate = ($day % 6 === 0);
                $status = $isLate ? 'late' : 'present';

                Attendance::updateOrCreate(
                    [
                        'student_id' => $student->id,
                        'date' => $attDate,
                    ],
                    [
                        'class_id' => $student->class_id,
                        'section_id' => $student->section_id,
                        'status' => $status,
                        'remarks' => $isLate ? 'Arrived 10 minutes late' : null,
                    ]
                );
                $attendanceCount++;
            }
        }
        $this->command->info("✓ Seeded {$attendanceCount} Attendance records for November 2026");

        // 8. Seed Exams & Grades for 2026-2027
        $exam1 = Exam::firstOrCreate(
            ['academic_year_id' => $academicYear->id, 'code' => 'UT1-2026'],
            [
                'name' => 'First Unit Test 2026',
                'type' => 'unit-test',
                'start_date' => '2026-07-20',
                'end_date' => '2026-07-25',
                'description' => 'First unit evaluation test for 2026-2027',
                'publish_results' => true,
                'status' => 'completed',
            ]
        );

        $exam2 = Exam::firstOrCreate(
            ['academic_year_id' => $academicYear->id, 'code' => 'MTE-2026'],
            [
                'name' => 'Mid-Term Examination 2026',
                'type' => 'mid-term',
                'start_date' => '2026-10-12',
                'end_date' => '2026-10-24',
                'description' => 'Half-yearly examination for all subjects',
                'publish_results' => true,
                'status' => 'completed',
            ]
        );

        $exam3 = Exam::firstOrCreate(
            ['academic_year_id' => $academicYear->id, 'code' => 'FE-2027'],
            [
                'name' => 'Final Examination 2027',
                'type' => 'final',
                'start_date' => '2027-03-08',
                'end_date' => '2027-03-20',
                'description' => 'Annual final examination for session end',
                'publish_results' => false,
                'status' => 'scheduled',
            ]
        );

        $gradeCount = 0;
        foreach ($createdStudents as $info) {
            $student = $info['student'];
            foreach ($subjects as $code => $subject) {
                $marks = rand(65, 96);
                $grade = $marks >= 90 ? 'A+' : ($marks >= 80 ? 'A' : ($marks >= 70 ? 'B+' : 'B'));

                Grade::updateOrCreate(
                    [
                        'exam_id' => $exam2->id,
                        'student_id' => $student->id,
                        'subject_id' => $subject->id,
                    ],
                    [
                        'class_id' => $student->class_id,
                        'section_id' => $student->section_id,
                        'marks_obtained' => $marks,
                        'total_marks' => 100,
                        'grade' => $grade,
                        'remarks' => 'Good academic grasp and participation',
                        'is_absent' => false,
                    ]
                );
                $gradeCount++;
            }
        }
        $this->command->info("✓ Seeded 3 Exams & {$gradeCount} Grades for 2026-2027 session");

        // 9. Seed Assignments for 2026-2027
        $teacher = Teacher::first();
        $teacherId = $teacher ? $teacher->id : null;

        if ($teacherId) {
            $assignmentDefs = [
                ['title' => 'Maths Chapter 4 Practice Problems', 'subject_code' => 'MATH', 'class_num' => 1, 'due' => '2026-11-20'],
                ['title' => 'English Grammar & Essay Writing', 'subject_code' => 'ENG', 'class_num' => 1, 'due' => '2026-11-22'],
                ['title' => 'Science Plant Biology Project', 'subject_code' => 'SCI', 'class_num' => 2, 'due' => '2026-11-25'],
                ['title' => 'Computer Coding Basics Worksheet', 'subject_code' => 'CS', 'class_num' => 3, 'due' => '2026-11-18'],
            ];

            foreach ($assignmentDefs as $aDef) {
                $classObj = $classes[$aDef['class_num']];
                $secObj = $sections["{$aDef['class_num']}-A"];
                $subjObj = $subjects[$aDef['subject_code']];

                Assignment::updateOrCreate(
                    [
                        'class_id' => $classObj->id,
                        'subject_id' => $subjObj->id,
                        'title' => $aDef['title'],
                    ],
                    [
                        'section_id' => $secObj->id,
                        'teacher_id' => $teacherId,
                        'description' => "Complete assignment questions for {$subjObj->name} and submit on time.",
                        'assigned_date' => '2026-11-10',
                        'due_date' => $aDef['due'],
                        'total_marks' => 25,
                        'status' => 'active',
                    ]
                );
            }
            $this->command->info("✓ Seeded 4 Active Assignments for November 2026");
        }

        $this->command->info('=== Dummy Data Generation for 2026-2027 Completed Successfully! ===');
    }
}
