<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;
use App\Models\Teacher;
use App\Models\Student;
use App\Models\ParentModel;

class SyncIndianDemoData extends Command
{
    protected $signature = 'demo:sync-indian-data';
    protected $description = 'Sync all demo user, teacher, student, and parent data to Indian names, addresses, and phone numbers';

    public function handle()
    {
        $this->info('Updating core users...');

        $coreUserUpdates = [
            'superadmin@school.com' => [
                'name' => 'Dr. Rameshwar Sharma',
                'phone' => '+91 98765 00001',
                'gender' => 'male',
                'address' => '42, Shanti Kunj, Sector 14, Dwarka',
                'city' => 'New Delhi',
                'state' => 'Delhi',
                'country' => 'India',
                'postal_code' => '110078',
            ],
            'admin@school.com' => [
                'name' => 'Rajesh Sharma',
                'phone' => '+91 98765 00002',
                'gender' => 'male',
                'address' => '42, Shanti Kunj, Sector 14, Dwarka',
                'city' => 'New Delhi',
                'state' => 'Delhi',
                'country' => 'India',
                'postal_code' => '110078',
            ],
            'teacher@school.com' => [
                'name' => 'Vikram Malhotra',
                'phone' => '+91 98765 00003',
                'gender' => 'male',
                'address' => 'B-12, Teachers Enclave, Mayur Vihar Phase 1',
                'city' => 'New Delhi',
                'state' => 'Delhi',
                'country' => 'India',
                'postal_code' => '110091',
            ],
            'student@school.com' => [
                'name' => 'Aarohi Verma',
                'phone' => '+91 98765 00004',
                'gender' => 'female',
                'address' => 'Flat 302, Green Glen Layout, Bellandur',
                'city' => 'Bengaluru',
                'state' => 'Karnataka',
                'country' => 'India',
                'postal_code' => '560103',
            ],
            'parent@school.com' => [
                'name' => 'Ramesh Verma',
                'phone' => '+91 98765 00005',
                'gender' => 'male',
                'address' => 'Flat 302, Green Glen Layout, Bellandur',
                'city' => 'Bengaluru',
                'state' => 'Karnataka',
                'country' => 'India',
                'postal_code' => '560103',
            ],
            'accountant@school.com' => [
                'name' => 'Sunita Patel',
                'phone' => '+91 98765 00006',
                'gender' => 'female',
                'address' => '108, Navrangpura',
                'city' => 'Ahmedabad',
                'state' => 'Gujarat',
                'country' => 'India',
                'postal_code' => '380009',
            ],
        ];

        foreach ($coreUserUpdates as $email => $attrs) {
            User::where('email', $email)->update($attrs);
        }

        $this->info('Updating teachers...');
        $teacherUser = User::where('email', 'teacher@school.com')->first();
        if ($teacherUser) {
            Teacher::where('user_id', $teacherUser->id)->update([
                'first_name' => 'Vikram',
                'last_name' => 'Malhotra',
            ]);
        }

        $teachers = [
            'rajesh.kumar@school.com' => ['phone' => '+91 98765 11002', 'address' => 'B-24, Sector 62', 'city' => 'Noida', 'state' => 'Uttar Pradesh', 'country' => 'India', 'postal_code' => '201309'],
            'priya.sharma@school.com' => ['phone' => '+91 98765 11003', 'address' => 'C-88, South Extension Part 2', 'city' => 'New Delhi', 'state' => 'Delhi', 'country' => 'India', 'postal_code' => '110049'],
            'amit.patel@school.com' => ['phone' => '+91 98765 11004', 'address' => '402, Navrangpura', 'city' => 'Ahmedabad', 'state' => 'Gujarat', 'country' => 'India', 'postal_code' => '380009'],
            'anjali.gupta@school.com' => ['phone' => '+91 98765 11005', 'address' => '703, Cyber City View, Gachibowli', 'city' => 'Hyderabad', 'state' => 'Telangana', 'country' => 'India', 'postal_code' => '500032'],
            'rahul.mehta@school.com' => ['phone' => '+91 98765 11006', 'address' => '52, Shivaji Park, Dadar West', 'city' => 'Mumbai', 'state' => 'Maharashtra', 'country' => 'India', 'postal_code' => '400028'],
        ];
        foreach ($teachers as $email => $data) {
            User::where('email', $email)->update($data);
        }

        $this->info('Updating students...');
        $studentUser = User::where('email', 'student@school.com')->first();
        if ($studentUser) {
            Student::where('user_id', $studentUser->id)->update([
                'first_name' => 'Aarohi',
                'last_name' => 'Verma',
                'nationality' => 'Indian',
                'emergency_contact_name' => 'Ramesh Verma',
                'emergency_contact_phone' => '+91 98765 00005',
                'emergency_contact_relation' => 'Father',
            ]);
        }

        $otherStudents = [
            'aarav.kumar@student.com' => [
                'user' => ['phone' => '+91 98765 22002', 'address' => '14, Mall Road, Civil Lines', 'city' => 'Jaipur', 'state' => 'Rajasthan', 'country' => 'India', 'postal_code' => '302006'],
                'student' => ['nationality' => 'Indian', 'emergency_contact_name' => 'Sanjay Kumar', 'emergency_contact_phone' => '+91 98765 22102', 'emergency_contact_relation' => 'Father'],
            ],
            'diya.sharma@student.com' => [
                'user' => ['phone' => '+91 98765 22003', 'address' => '88, Kankurgachi Main Road', 'city' => 'Kolkata', 'state' => 'West Bengal', 'country' => 'India', 'postal_code' => '700054'],
                'student' => ['nationality' => 'Indian', 'emergency_contact_name' => 'Alok Sharma', 'emergency_contact_phone' => '+91 98765 22103', 'emergency_contact_relation' => 'Father'],
            ],
            'vivaan.patel@student.com' => [
                'user' => ['phone' => '+91 98765 22004', 'address' => 'C-12, Alkapuri Society', 'city' => 'Vadodara', 'state' => 'Gujarat', 'country' => 'India', 'postal_code' => '390007'],
                'student' => ['nationality' => 'Indian', 'emergency_contact_name' => 'Bhavesh Patel', 'emergency_contact_phone' => '+91 98765 22104', 'emergency_contact_relation' => 'Father'],
            ],
            'ananya.singh@student.com' => [
                'user' => ['phone' => '+91 98765 22005', 'address' => '56, Gomti Nagar Extension', 'city' => 'Lucknow', 'state' => 'Uttar Pradesh', 'country' => 'India', 'postal_code' => '226010'],
                'student' => ['nationality' => 'Indian', 'emergency_contact_name' => 'Vikramaditya Singh', 'emergency_contact_phone' => '+91 98765 22105', 'emergency_contact_relation' => 'Father'],
            ],
        ];

        foreach ($otherStudents as $email => $data) {
            $u = User::where('email', $email)->first();
            if ($u) {
                $u->update($data['user']);
                Student::where('user_id', $u->id)->update($data['student']);
            }
        }

        // Ensure all users have country India
        User::whereNull('country')->orWhere('country', 'USA')->update(['country' => 'India']);
        Student::whereNull('nationality')->orWhere('nationality', 'American')->update(['nationality' => 'Indian']);

        $this->info('Updating parents...');
        $parentUser = User::where('email', 'parent@school.com')->first();
        if ($parentUser) {
            ParentModel::where('user_id', $parentUser->id)->update([
                'father_name' => 'Ramesh Verma',
                'father_phone' => '+91 98765 00005',
                'father_email' => 'parent@school.com',
                'father_occupation' => 'Senior Civil Engineer',
                'mother_name' => 'Meenakshi Verma',
                'mother_phone' => '+91 98765 99005',
                'mother_email' => 'meenakshi.verma@school.com',
                'mother_occupation' => 'Associate Professor',
            ]);
        }

        $this->info('All records updated successfully to Indian names, phone numbers, and addresses!');
        return 0;
    }
}

