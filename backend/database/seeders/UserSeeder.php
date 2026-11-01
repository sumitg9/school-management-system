<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Create Super Admin
        $superAdmin = User::create([
            'name' => 'Dr. Rameshwar Sharma',
            'email' => 'superadmin@school.com',
            'password' => Hash::make('password'),
            'phone' => '+91 98765 00001',
            'address' => '42, Shanti Kunj, Sector 14, Dwarka',
            'city' => 'New Delhi',
            'state' => 'Delhi',
            'country' => 'India',
            'postal_code' => '110078',
            'status' => 'active',
        ]);
        $superAdmin->assignRole('super-admin');

        // Create Admin
        $admin = User::create([
            'name' => 'Rajesh Sharma',
            'email' => 'admin@school.com',
            'password' => Hash::make('password'),
            'phone' => '+91 98765 00002',
            'address' => '42, Shanti Kunj, Sector 14, Dwarka',
            'city' => 'New Delhi',
            'state' => 'Delhi',
            'country' => 'India',
            'postal_code' => '110078',
            'status' => 'active',
        ]);
        $admin->assignRole('admin');

        // Create Teacher
        $teacher = User::create([
            'name' => 'Vikram Malhotra',
            'email' => 'teacher@school.com',
            'password' => Hash::make('password'),
            'phone' => '+91 98765 00003',
            'address' => 'B-12, Teachers Enclave, Mayur Vihar Phase 1',
            'city' => 'New Delhi',
            'state' => 'Delhi',
            'country' => 'India',
            'postal_code' => '110091',
            'status' => 'active',
        ]);
        $teacher->assignRole('teacher');

        // Create Student
        $student = User::create([
            'name' => 'Aarohi Verma',
            'email' => 'student@school.com',
            'password' => Hash::make('password'),
            'phone' => '+91 98765 00004',
            'address' => 'Flat 302, Green Glen Layout, Bellandur',
            'city' => 'Bengaluru',
            'state' => 'Karnataka',
            'country' => 'India',
            'postal_code' => '560103',
            'status' => 'active',
        ]);
        $student->assignRole('student');

        // Create Parent
        $parent = User::create([
            'name' => 'Ramesh Verma',
            'email' => 'parent@school.com',
            'password' => Hash::make('password'),
            'phone' => '+91 98765 00005',
            'address' => 'Flat 302, Green Glen Layout, Bellandur',
            'city' => 'Bengaluru',
            'state' => 'Karnataka',
            'country' => 'India',
            'postal_code' => '560103',
            'status' => 'active',
        ]);
        $parent->assignRole('parent');

        // Create Accountant
        $accountant = User::create([
            'name' => 'Sunita Patel',
            'email' => 'accountant@school.com',
            'password' => Hash::make('password'),
            'phone' => '+91 98765 00006',
            'address' => '108, Navrangpura',
            'city' => 'Ahmedabad',
            'state' => 'Gujarat',
            'country' => 'India',
            'postal_code' => '380009',
            'status' => 'active',
        ]);
        $accountant->assignRole('accountant');

        $this->command->info('Default users created successfully!');
        $this->command->info('Login credentials:');
        $this->command->info('Super Admin: superadmin@school.com / password');
        $this->command->info('Admin: admin@school.com / password');
        $this->command->info('Teacher: teacher@school.com / password');
        $this->command->info('Student: student@school.com / password');
        $this->command->info('Parent: parent@school.com / password');
        $this->command->info('Accountant: accountant@school.com / password');
    }
}

