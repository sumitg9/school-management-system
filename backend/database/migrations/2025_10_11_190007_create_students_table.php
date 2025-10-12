<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('students', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('academic_year_id')->constrained()->onDelete('restrict');
            $table->foreignId('class_id')->constrained()->onDelete('restrict');
            $table->foreignId('section_id')->constrained()->onDelete('restrict');
            $table->string('admission_number', 50)->unique();
            $table->date('admission_date');
            $table->string('first_name', 100);
            $table->string('last_name', 100);
            $table->string('roll_number', 20)->nullable();
            $table->string('blood_group', 10)->nullable();
            $table->string('religion', 50)->nullable();
            $table->string('caste', 50)->nullable();
            $table->string('nationality', 50)->default('American');
            $table->string('mother_tongue', 50)->nullable();
            $table->string('previous_school', 200)->nullable();
            $table->text('medical_conditions')->nullable();
            $table->text('allergies')->nullable();
            $table->string('emergency_contact_name', 100)->nullable();
            $table->string('emergency_contact_phone', 20)->nullable();
            $table->string('emergency_contact_relation', 50)->nullable();
            $table->enum('status', ['active', 'inactive', 'graduated', 'transferred', 'expelled'])->default('active');
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index('user_id');
            $table->index('academic_year_id');
            $table->index('class_id');
            $table->index('section_id');
            $table->index('admission_number');
            $table->index('status');
            $table->index(['class_id', 'section_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('students');
    }
};

