<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations for Multi-School / Multi-Branch Enterprise Architecture.
     */
    public function up(): void
    {
        // 1. Create master schools table
        if (!Schema::hasTable('schools')) {
            Schema::create('schools', function (Blueprint $table) {
                $table->id();
                $table->uuid('uuid')->unique();
                $table->string('code', 50)->unique();
                $table->string('name', 255);
                $table->string('short_name', 100);
                $table->string('slug', 100)->unique();
                $table->string('affiliation_number', 100)->nullable();
                $table->integer('established_year')->nullable();
                $table->string('curriculum', 100)->default('CBSE');
                
                // Contact & Location
                $table->text('address')->nullable();
                $table->string('city', 100)->nullable();
                $table->string('state', 100)->nullable();
                $table->string('postal_code', 20)->nullable();
                $table->string('country', 100)->default('India');
                $table->string('phone', 50)->nullable();
                $table->string('email', 255)->nullable();
                $table->string('website', 255)->nullable();
                
                // Branding & Identity
                $table->string('logo', 255)->nullable();
                $table->string('primary_color', 20)->default('#2563EB');
                $table->string('receipt_prefix', 20)->default('REC-');
                
                // Management & Status
                $table->string('principal_name', 255)->nullable();
                $table->enum('status', ['active', 'inactive', 'suspended'])->default('active');
                $table->json('settings')->nullable();
                
                $table->timestamps();
                $table->softDeletes();
            });

            // Seed default primary campus
            DB::table('schools')->insert([
                'id' => 1,
                'uuid' => 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
                'code' => 'TT-SIL-01',
                'name' => 'Twinkling Toddlers Senior Secondary School - Siliguri Main Campus',
                'short_name' => 'Siliguri Main',
                'slug' => 'siliguri-main',
                'affiliation_number' => 'CBSE/AFF/2430188',
                'established_year' => 2012,
                'curriculum' => 'CBSE',
                'address' => 'Hill Cart Road, Pradhan Nagar',
                'city' => 'Siliguri',
                'state' => 'West Bengal',
                'postal_code' => '734001',
                'country' => 'India',
                'phone' => '+91 353 2548900',
                'email' => 'siliguri.campus@school.com',
                'website' => 'https://siliguri.twinklingtoddlers.edu',
                'logo' => 'preset:🏫',
                'primary_color' => '#2563EB',
                'receipt_prefix' => 'REC-SIL-',
                'principal_name' => 'Dr. Sunita Sharma',
                'status' => 'active',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        // 2. Create user_schools pivot table for multi-branch assignment
        if (!Schema::hasTable('user_schools')) {
            Schema::create('user_schools', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained()->onDelete('cascade');
                $table->foreignId('school_id')->constrained()->onDelete('cascade');
                $table->string('role', 50)->default('admin');
                $table->boolean('is_primary')->default(false);
                $table->timestamps();

                $table->unique(['user_id', 'school_id']);
                $table->index('user_id');
                $table->index('school_id');
            });
        }

        // 3. Add school_id to all operational tables (non-destructive)
        $tables = [
            'users',
            'academic_years',
            'classes',
            'sections',
            'subjects',
            'students',
            'teachers',
            'parents',
            'attendances',
            'exams',
            'fee_structures',
            'fee_payments',
            'assignments',
            'notifications',
        ];

        foreach ($tables as $tableName) {
            if (Schema::hasTable($tableName)) {
                Schema::table($tableName, function (Blueprint $table) use ($tableName) {
                    if (!Schema::hasColumn($tableName, 'school_id')) {
                        $table->foreignId('school_id')->nullable()->default(1)->constrained('schools')->onDelete('cascade');
                        $table->index('school_id');
                    }
                });

                // Backfill existing rows to school_id = 1
                DB::table($tableName)->whereNull('school_id')->update(['school_id' => 1]);
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $tables = [
            'notifications',
            'assignments',
            'fee_payments',
            'fee_structures',
            'exams',
            'attendances',
            'parents',
            'teachers',
            'students',
            'subjects',
            'sections',
            'classes',
            'academic_years',
            'users',
        ];

        foreach ($tables as $tableName) {
            if (Schema::hasTable($tableName) && Schema::hasColumn($tableName, 'school_id')) {
                Schema::table($tableName, function (Blueprint $table) {
                    $table->dropForeign(['school_id']);
                    $table->dropColumn('school_id');
                });
            }
        }

        Schema::dropIfExists('user_schools');
        Schema::dropIfExists('schools');
    }
};

