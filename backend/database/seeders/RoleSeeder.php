<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

class RoleSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Reset cached roles and permissions
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        // Create permissions
        $permissions = [
            // Student Management
            'view-students',
            'create-students',
            'edit-students',
            'delete-students',
            
            // Teacher Management
            'view-teachers',
            'create-teachers',
            'edit-teachers',
            'delete-teachers',
            
            // Class Management
            'view-classes',
            'create-classes',
            'edit-classes',
            'delete-classes',
            
            // Attendance Management
            'view-attendance',
            'mark-attendance',
            'edit-attendance',
            'delete-attendance',
            
            // Exam Management
            'view-exams',
            'create-exams',
            'edit-exams',
            'delete-exams',
            'view-grades',
            'enter-grades',
            'edit-grades',
            
            // Fee Management
            'view-fees',
            'create-fees',
            'edit-fees',
            'delete-fees',
            'collect-fees',
            
            // Assignment Management
            'view-assignments',
            'create-assignments',
            'edit-assignments',
            'delete-assignments',
            'grade-assignments',
            
            // Report Management
            'view-reports',
            'generate-reports',
            
            // Settings
            'manage-settings',
            'manage-roles',
            'manage-permissions',
        ];

        foreach ($permissions as $permission) {
            Permission::create(['name' => $permission]);
        }

        // Create roles and assign permissions
        
        // Super Admin - All permissions
        $superAdmin = Role::create(['name' => 'super-admin']);
        $superAdmin->givePermissionTo(Permission::all());

        // Admin - Most permissions except system settings
        $admin = Role::create(['name' => 'admin']);
        $admin->givePermissionTo([
            'view-students', 'create-students', 'edit-students', 'delete-students',
            'view-teachers', 'create-teachers', 'edit-teachers', 'delete-teachers',
            'view-classes', 'create-classes', 'edit-classes', 'delete-classes',
            'view-attendance', 'mark-attendance', 'edit-attendance',
            'view-exams', 'create-exams', 'edit-exams',
            'view-grades', 'enter-grades', 'edit-grades',
            'view-fees', 'create-fees', 'edit-fees',
            'view-assignments', 'create-assignments', 'edit-assignments',
            'view-reports', 'generate-reports',
        ]);

        // Teacher - Teaching related permissions
        $teacher = Role::create(['name' => 'teacher']);
        $teacher->givePermissionTo([
            'view-students',
            'view-classes',
            'view-attendance', 'mark-attendance',
            'view-exams', 'view-grades', 'enter-grades',
            'view-assignments', 'create-assignments', 'edit-assignments', 'grade-assignments',
        ]);

        // Student - View only permissions
        $student = Role::create(['name' => 'student']);
        $student->givePermissionTo([
            'view-attendance',
            'view-exams', 'view-grades',
            'view-fees',
            'view-assignments',
        ]);

        // Parent - View child's information
        $parent = Role::create(['name' => 'parent']);
        $parent->givePermissionTo([
            'view-students',
            'view-attendance',
            'view-exams', 'view-grades',
            'view-fees',
            'view-assignments',
        ]);

        // Accountant - Fee management
        $accountant = Role::create(['name' => 'accountant']);
        $accountant->givePermissionTo([
            'view-students',
            'view-fees', 'create-fees', 'edit-fees', 'collect-fees',
            'view-reports', 'generate-reports',
        ]);

        // Librarian - Library management
        $librarian = Role::create(['name' => 'librarian']);
        $librarian->givePermissionTo([
            'view-students',
            'view-teachers',
        ]);

        // Receptionist - Basic view permissions
        $receptionist = Role::create(['name' => 'receptionist']);
        $receptionist->givePermissionTo([
            'view-students',
            'view-teachers',
            'view-classes',
        ]);

        $this->command->info('Roles and permissions created successfully!');
    }
}

