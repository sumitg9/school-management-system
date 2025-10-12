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
            'name' => 'Super Admin',
            'email' => 'superadmin@school.com',
            'password' => Hash::make('password'),
            'phone' => '+1234567890',
            'status' => 'active',
        ]);
        $superAdmin->assignRole('super-admin');

        // Create Admin
        $admin = User::create([
            'name' => 'Admin User',
            'email' => 'admin@school.com',
            'password' => Hash::make('password'),
            'phone' => '+1234567891',
            'status' => 'active',
        ]);
        $admin->assignRole('admin');

        // Create Teacher
        $teacher = User::create([
            'name' => 'John Teacher',
            'email' => 'teacher@school.com',
            'password' => Hash::make('password'),
            'phone' => '+1234567892',
            'status' => 'active',
        ]);
        $teacher->assignRole('teacher');

        // Create Student
        $student = User::create([
            'name' => 'Jane Student',
            'email' => 'student@school.com',
            'password' => Hash::make('password'),
            'phone' => '+1234567893',
            'status' => 'active',
        ]);
        $student->assignRole('student');

        // Create Parent
        $parent = User::create([
            'name' => 'Parent User',
            'email' => 'parent@school.com',
            'password' => Hash::make('password'),
            'phone' => '+1234567894',
            'status' => 'active',
        ]);
        $parent->assignRole('parent');

        // Create Accountant
        $accountant = User::create([
            'name' => 'Accountant User',
            'email' => 'accountant@school.com',
            'password' => Hash::make('password'),
            'phone' => '+1234567895',
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

