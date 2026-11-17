<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Carbon\Carbon;
use App\Models\AcademicYear;
use App\Models\ClassModel;
use App\Models\Section;
use App\Models\Subject;
use App\Models\Teacher;
use App\Models\Student;
use App\Models\ParentModel;
use App\Models\User;
use App\Models\FeeStructure;
use App\Models\FeePayment;
use App\Models\Attendance;
use App\Models\Notification;

class MultiSchoolEnterpriseSeeder extends Seeder
{
    /**
     * Run the multi-school enterprise dummy data seeder.
     */
    public function run(): void
    {
        $this->command->info('===============================================================');
        $this->command->info('🚀 STARTING MULTI-SCHOOL ENTERPRISE SEEDER (ALL BRANCHES & FEATURES)');
        $this->command->info('===============================================================');

        // -------------------------------------------------------------
        // 1. Seed or Update Schools (Branches)
        // -------------------------------------------------------------
        $schools = [
            [
                'id' => 1,
                'uuid' => 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
                'name' => 'Delhi Public School, Siliguri Main Campus',
                'short_name' => 'Siliguri Main',
                'slug' => 'siliguri-main',
                'code' => 'DPS-SLG-01',
                'affiliation_number' => 'CBSE/AFF/WB/2021/33401',
                'curriculum' => 'CBSE',
                'established_year' => 2012,
                'principal_name' => 'Dr. Anirban Mukherjee, Ph.D.',
                'email' => 'principal.siliguri@school.com',
                'phone' => '+91 353 2548901',
                'address' => 'Pradhan Nagar, Hill Cart Road',
                'city' => 'Siliguri',
                'state' => 'West Bengal',
                'postal_code' => '734001',
                'receipt_prefix' => 'REC-SLG-',
                'primary_color' => '#2563EB',
                'logo' => 'preset:🏫',
                'status' => 'active',
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ],
            [
                'id' => 2,
                'uuid' => 'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e',
                'name' => 'Delhi Public School, Kolkata Central Campus',
                'short_name' => 'Kolkata Central',
                'slug' => 'kolkata-central',
                'code' => 'DPS-KOL-02',
                'affiliation_number' => 'CISCE/WB/2019/5521',
                'curriculum' => 'ICSE',
                'established_year' => 2016,
                'principal_name' => "Sister Margaret D'Souza, M.Ed.",
                'email' => 'principal.kolkata@school.com',
                'phone' => '+91 33 22894100',
                'address' => '48 Park Street, Central District',
                'city' => 'Kolkata',
                'state' => 'West Bengal',
                'postal_code' => '700016',
                'receipt_prefix' => 'REC-KOL-',
                'primary_color' => '#7C3AED',
                'logo' => 'preset:🏛️',
                'status' => 'active',
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ],
            [
                'id' => 3,
                'uuid' => 'c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f',
                'name' => 'Delhi Public School, Bangalore South Campus',
                'short_name' => 'Bangalore South',
                'slug' => 'bangalore-south',
                'code' => 'DPS-BLR-03',
                'affiliation_number' => 'CBSE/AFF/KT/2022/44108',
                'curriculum' => 'CBSE',
                'established_year' => 2020,
                'principal_name' => 'Dr. R. K. Venkatesh, M.Sc., Ph.D.',
                'email' => 'principal.bangalore@school.com',
                'phone' => '+91 80 41258900',
                'address' => '12th Main, 4th Block, Koramangala',
                'city' => 'Bengaluru',
                'state' => 'Karnataka',
                'postal_code' => '560034',
                'receipt_prefix' => 'REC-BLR-',
                'primary_color' => '#059669',
                'logo' => 'preset:🎓',
                'status' => 'active',
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ],
        ];

        foreach ($schools as $sch) {
            DB::table('schools')->updateOrInsert(['id' => $sch['id']], $sch);
        }
        $this->command->info('✓ 3 School Campuses Seeded (Siliguri, Kolkata, Bangalore)');

        // -------------------------------------------------------------
        // 2. Academic Year 2026-2027
        // -------------------------------------------------------------
        $academicYear = AcademicYear::firstOrCreate(
            ['name' => '2026-2027'],
            [
                'start_date' => '2026-04-01',
                'end_date' => '2027-03-31',
                'is_current' => true,
                'status' => 'active',
                'description' => 'Current Academic Session 2026-2027',
            ]
        );
        $this->command->info("✓ Academic Year 2026-2027 set as Current (ID: {$academicYear->id})");

        // -------------------------------------------------------------
        // 3. Classes and Sections for Each Branch
        // -------------------------------------------------------------
        $classesBySchool = [];
        $sectionsByClass = [];
        foreach ($schools as $sch) {
            $schoolId = $sch['id'];
            $classesBySchool[$schoolId] = [];

            for ($i = 1; $i <= 10; $i++) {
                $cls = ClassModel::firstOrCreate(
                    [
                        'name' => "Class {$i}",
                        'school_id' => $schoolId,
                    ],
                    [
                        'numeric_name' => (string)$i,
                        'order' => $i,
                        'description' => "Standard {$i} ({$sch['short_name']})",
                        'status' => 'active',
                    ]
                );
                $classesBySchool[$schoolId][$i] = $cls;

                // Create Sections A & B
                foreach (['A', 'B'] as $secName) {
                    $sec = Section::firstOrCreate(
                        [
                            'class_id' => $cls->id,
                            'name' => $secName,
                        ],
                        [
                            'capacity' => 40,
                            'current_strength' => 30,
                            'status' => 'active',
                        ]
                    );
                    $sectionsByClass["{$cls->id}_{$secName}"] = $sec;
                }
            }
        }
        $this->command->info('✓ Classes 1-10 & Sections A/B Seeded Across All 3 Branches');

        // -------------------------------------------------------------
        // 4. Subjects per Branch
        // -------------------------------------------------------------
        $branchSubjects = [
            1 => [
                ['name' => 'English Core', 'code' => 'ENG-SLG', 'type' => 'theory'],
                ['name' => 'Mathematics', 'code' => 'MATH-SLG', 'type' => 'theory'],
                ['name' => 'General Science', 'code' => 'SCI-SLG', 'type' => 'both'],
                ['name' => 'Social Studies', 'code' => 'SST-SLG', 'type' => 'theory'],
                ['name' => 'Hindi Course A', 'code' => 'HIN-SLG', 'type' => 'theory'],
                ['name' => 'Computer Applications', 'code' => 'CA-SLG', 'type' => 'both'],
            ],
            2 => [
                ['name' => 'English Language & Lit', 'code' => 'ENG-KOL', 'type' => 'theory'],
                ['name' => 'Mathematics (ICSE)', 'code' => 'MATH-KOL', 'type' => 'theory'],
                ['name' => 'Physics & Chemistry', 'code' => 'PHYCHEM-KOL', 'type' => 'both'],
                ['name' => 'Biology & EVS', 'code' => 'BIO-KOL', 'type' => 'both'],
                ['name' => 'History & Civics', 'code' => 'HIST-KOL', 'type' => 'theory'],
                ['name' => 'Commercial Studies', 'code' => 'COMM-KOL', 'type' => 'theory'],
            ],
            3 => [
                ['name' => 'English Communicative', 'code' => 'ENG-BLR', 'type' => 'theory'],
                ['name' => 'Mathematics & Analytics', 'code' => 'MATH-BLR', 'type' => 'theory'],
                ['name' => 'Integrated Science', 'code' => 'SCI-BLR', 'type' => 'both'],
                ['name' => 'AI & Robotics Studio', 'code' => 'AI-BLR', 'type' => 'both'],
                ['name' => 'Coding & Python', 'code' => 'CODE-BLR', 'type' => 'both'],
                ['name' => 'Kannada Language', 'code' => 'KAN-BLR', 'type' => 'theory'],
            ],
        ];

        foreach ($branchSubjects as $schoolId => $subList) {
            foreach ($subList as $sDef) {
                Subject::firstOrCreate(
                    ['code' => $sDef['code']],
                    [
                        'name' => $sDef['name'],
                        'type' => $sDef['type'],
                        'total_marks' => 100,
                        'passing_marks' => 40,
                        'status' => 'active',
                    ]
                );
            }
        }
        $this->command->info('✓ Core & Regional Curriculum Subjects Seeded');

        // -------------------------------------------------------------
        // 5. Teachers & Faculty per Branch (With Bank & IFSC)
        // -------------------------------------------------------------
        $facultyData = [
            1 => [
                ['fname' => 'Rajesh', 'lname' => 'Kumar', 'emp' => 'EMP-SLG-01', 'email' => 'rajesh.kumar@school.com', 'dept' => 'Mathematics', 'desig' => 'HOD & PGT Mathematics', 'sal' => 58000, 'bank' => 'State Bank of India', 'acc' => '31098455621', 'ifsc' => 'SBIN0000184'],
                ['fname' => 'Sunita', 'lname' => 'Sen', 'emp' => 'EMP-SLG-02', 'email' => 'sunita.sen@school.com', 'dept' => 'Science', 'desig' => 'PGT Physics', 'sal' => 52000, 'bank' => 'HDFC Bank', 'acc' => '5010041289901', 'ifsc' => 'HDFC0000085'],
                ['fname' => 'Bikas', 'lname' => 'Chettri', 'emp' => 'EMP-SLG-05', 'email' => 'bikas.chettri@school.com', 'dept' => 'Sports', 'desig' => 'Sports Director', 'sal' => 43000, 'bank' => 'Punjab National Bank', 'acc' => '142300010024589', 'ifsc' => 'PUNB0014200'],
            ],
            2 => [
                ['fname' => 'Debashis', 'lname' => 'Banerjee', 'emp' => 'EMP-KOL-01', 'email' => 'debashis.banerjee@school.com', 'dept' => 'Mathematics', 'desig' => 'Vice Principal', 'sal' => 64000, 'bank' => 'State Bank of India', 'acc' => '20045899124', 'ifsc' => 'SBIN0000001'],
                ['fname' => 'Sarmistha', 'lname' => 'Ghosh', 'emp' => 'EMP-KOL-02', 'email' => 'sarmistha.ghosh@school.com', 'dept' => 'Science', 'desig' => 'Senior Biology Faculty', 'sal' => 54000, 'bank' => 'HDFC Bank', 'acc' => '5010098452101', 'ifsc' => 'HDFC0000014'],
                ['fname' => 'Kaushik', 'lname' => 'Ganguly', 'emp' => 'EMP-KOL-05', 'email' => 'kaushik.ganguly@school.com', 'dept' => 'Sports', 'desig' => 'Head Cricket Coach', 'sal' => 45000, 'bank' => 'Bank of Baroda', 'acc' => '01420100029871', 'ifsc' => 'BARB0PARKST'],
            ],
            3 => [
                ['fname' => 'S. R.', 'lname' => 'Nagaraj', 'emp' => 'EMP-BLR-01', 'email' => 'sr.nagaraj@school.com', 'dept' => 'Computer Science', 'desig' => 'HOD AI & Robotics', 'sal' => 65000, 'bank' => 'HDFC Bank', 'acc' => '5010088991201', 'ifsc' => 'HDFC0000184'],
                ['fname' => 'Vidya', 'lname' => 'Krishnan', 'emp' => 'EMP-BLR-02', 'email' => 'vidya.krishnan@school.com', 'dept' => 'Science', 'desig' => 'PGT Physics', 'sal' => 56000, 'bank' => 'State Bank of India', 'acc' => '31289004561', 'ifsc' => 'SBIN0001811'],
                ['fname' => 'Deepa', 'lname' => 'Hegde', 'emp' => 'EMP-BLR-05', 'email' => 'deepa.hegde@school.com', 'dept' => 'Languages', 'desig' => 'TGT Kannada', 'sal' => 44000, 'bank' => 'Canara Bank', 'acc' => '0412101089451', 'ifsc' => 'CNRB0000412'],
            ],
        ];

        foreach ($facultyData as $schoolId => $tList) {
            foreach ($tList as $t) {
                $user = User::firstOrCreate(
                    ['email' => $t['email']],
                    [
                        'name' => "{$t['fname']} {$t['lname']}",
                        'password' => Hash::make('password123'),
                        'school_id' => $schoolId,
                        'status' => 'active',
                    ]
                );
                try {
                    $user->assignRole('teacher');
                } catch (\Throwable $e) {}

                Teacher::updateOrCreate(
                    ['employee_id' => $t['emp']],
                    [
                        'user_id' => $user->id,
                        'school_id' => $schoolId,
                        'first_name' => $t['fname'],
                        'last_name' => $t['lname'],
                        'designation' => $t['desig'],
                        'department' => $t['dept'],
                        'salary' => $t['sal'],
                        'bank_name' => $t['bank'],
                        'bank_account_number' => $t['acc'],
                        'bank_ifsc' => $t['ifsc'],
                        'joining_date' => '2020-06-01',
                        'experience_years' => 8,
                        'status' => 'active',
                    ]
                );
            }
        }
        $this->command->info('✓ Faculty & Teachers Seeded with Bank Details across all branches');

        // -------------------------------------------------------------
        // 6. Students & Parents per Branch
        // -------------------------------------------------------------
        $studentsData = [
            1 => [
                ['fname' => 'Aarav', 'lname' => 'Sharma', 'adm' => 'SLG-2026-001', 'class_order' => 5, 'sec' => 'A', 'dob' => '2016-04-12', 'gender' => 'male', 'blood' => 'B+', 'pname' => 'Ramesh Sharma', 'phone' => '+91 98321 55101'],
                ['fname' => 'Sneha', 'lname' => 'Roy', 'adm' => 'SLG-2026-002', 'class_order' => 5, 'sec' => 'A', 'dob' => '2016-07-25', 'gender' => 'female', 'blood' => 'O+', 'pname' => 'Prabir Roy', 'phone' => '+91 98321 55103'],
                ['fname' => 'Rohan', 'lname' => 'Das', 'adm' => 'SLG-2026-003', 'class_order' => 6, 'sec' => 'B', 'dob' => '2015-02-18', 'gender' => 'male', 'blood' => 'A+', 'pname' => 'Debabrata Das', 'phone' => '+91 98321 55105'],
            ],
            2 => [
                ['fname' => 'Sourav', 'lname' => 'Ganguly', 'adm' => 'KOL-2026-001', 'class_order' => 5, 'sec' => 'A', 'dob' => '2016-03-14', 'gender' => 'male', 'blood' => 'O+', 'pname' => 'Chandranath Ganguly', 'phone' => '+91 98305 66201'],
                ['fname' => 'Priya', 'lname' => 'Mukherjee', 'adm' => 'KOL-2026-002', 'class_order' => 5, 'sec' => 'A', 'dob' => '2016-08-19', 'gender' => 'female', 'blood' => 'A+', 'pname' => 'Tanmay Mukherjee', 'phone' => '+91 98305 66203'],
                ['fname' => 'Arindam', 'lname' => 'Ghosh', 'adm' => 'KOL-2026-003', 'class_order' => 6, 'sec' => 'A', 'dob' => '2015-06-22', 'gender' => 'male', 'blood' => 'B+', 'pname' => 'Kallol Ghosh', 'phone' => '+91 98305 66205'],
            ],
            3 => [
                ['fname' => 'Aditi', 'lname' => 'Rao', 'adm' => 'BLR-2026-001', 'class_order' => 5, 'sec' => 'A', 'dob' => '2016-05-30', 'gender' => 'female', 'blood' => 'O+', 'pname' => 'Srinivasa Rao', 'phone' => '+91 98455 77301'],
                ['fname' => 'Varun', 'lname' => 'Reddy', 'adm' => 'BLR-2026-002', 'class_order' => 5, 'sec' => 'A', 'dob' => '2016-09-14', 'gender' => 'male', 'blood' => 'B+', 'pname' => 'C. V. Reddy', 'phone' => '+91 98455 77303'],
                ['fname' => 'Ananya', 'lname' => 'Hegde', 'adm' => 'BLR-2026-003', 'class_order' => 6, 'sec' => 'A', 'dob' => '2015-04-03', 'gender' => 'female', 'blood' => 'A+', 'pname' => 'Mahesh Hegde', 'phone' => '+91 98455 77305'],
            ],
        ];

        foreach ($studentsData as $schoolId => $stList) {
            foreach ($stList as $st) {
                $studentEmail = strtolower($st['fname'] . '.' . $st['lname'] . "@school{$schoolId}.local");
                $user = User::firstOrCreate(
                    ['email' => $studentEmail],
                    [
                        'name' => "{$st['fname']} {$st['lname']}",
                        'password' => Hash::make('password123'),
                        'date_of_birth' => $st['dob'],
                        'gender' => $st['gender'],
                        'school_id' => $schoolId,
                        'status' => 'active',
                    ]
                );
                try {
                    $user->assignRole('student');
                } catch (\Throwable $e) {}

                $targetClass = $classesBySchool[$schoolId][$st['class_order']] ?? null;
                $targetSection = $targetClass ? ($sectionsByClass["{$targetClass->id}_{$st['sec']}"] ?? null) : null;

                Student::updateOrCreate(
                    ['admission_number' => $st['adm']],
                    [
                        'user_id' => $user->id,
                        'school_id' => $schoolId,
                        'academic_year_id' => $academicYear->id,
                        'class_id' => $targetClass ? $targetClass->id : 1,
                        'section_id' => $targetSection ? $targetSection->id : 1,
                        'first_name' => $st['fname'],
                        'last_name' => $st['lname'],
                        'admission_date' => '2026-04-01',
                        'blood_group' => $st['blood'],
                        'status' => 'active',
                    ]
                );
            }
        }
        $this->command->info('✓ Students & Admission Records Seeded across all 3 branches');

        // -------------------------------------------------------------
        // 7. Fee Structures per Branch
        // -------------------------------------------------------------
        $feeDefs = [
            1 => [
                ['name' => 'Monthly Tuition Fee (Siliguri)', 'type' => 'tuition', 'amount' => 2800, 'freq' => 'monthly'],
                ['name' => 'Computer Lab Fee', 'type' => 'other', 'amount' => 600, 'freq' => 'monthly'],
                ['name' => 'Annual Development Fund', 'type' => 'other', 'amount' => 4500, 'freq' => 'one-time'],
            ],
            2 => [
                ['name' => 'Monthly Tuition Fee (Kolkata)', 'type' => 'tuition', 'amount' => 3200, 'freq' => 'monthly'],
                ['name' => 'Robotics & Maker Lab', 'type' => 'other', 'amount' => 800, 'freq' => 'monthly'],
                ['name' => 'Annual Heritage Activity Fee', 'type' => 'other', 'amount' => 5000, 'freq' => 'one-time'],
            ],
            3 => [
                ['name' => 'Monthly Tuition Fee (Bangalore)', 'type' => 'tuition', 'amount' => 3800, 'freq' => 'monthly'],
                ['name' => 'AI, Coding & Robotics Studio', 'type' => 'other', 'amount' => 1200, 'freq' => 'monthly'],
                ['name' => 'Annual Innovation Infrastructure', 'type' => 'other', 'amount' => 6500, 'freq' => 'one-time'],
            ],
        ];

        foreach ($feeDefs as $schoolId => $items) {
            $defaultClass = $classesBySchool[$schoolId][1] ?? ClassModel::where('school_id', $schoolId)->first();
            foreach ($items as $item) {
                FeeStructure::firstOrCreate(
                    [
                        'name' => $item['name'],
                        'school_id' => $schoolId,
                        'academic_year_id' => $academicYear->id,
                        'class_id' => $defaultClass ? $defaultClass->id : 1,
                    ],
                    [
                        'type' => $item['type'],
                        'amount' => $item['amount'],
                        'frequency' => $item['freq'],
                        'status' => 'active',
                    ]
                );
            }
        }
        $this->command->info('✓ Fee Structures Seeded for all 3 Campuses');

        $this->command->info('===============================================================');
        $this->command->info('🎉 MULTI-SCHOOL ENTERPRISE SEEDER COMPLETED SUCCESSFULLY!');
        $this->command->info('===============================================================');
    }
}
