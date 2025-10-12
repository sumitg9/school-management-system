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
        Schema::create('teachers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('employee_id', 50)->unique();
            $table->string('first_name', 100);
            $table->string('last_name', 100);
            $table->date('joining_date');
            $table->string('qualification', 200)->nullable();
            $table->string('specialization', 200)->nullable();
            $table->decimal('experience_years', 4, 1)->default(0);
            $table->string('designation', 100)->nullable();
            $table->string('department', 100)->nullable();
            $table->decimal('salary', 10, 2)->nullable();
            $table->string('bank_account_number', 50)->nullable();
            $table->string('bank_name', 100)->nullable();
            $table->string('bank_ifsc', 20)->nullable();
            $table->string('emergency_contact_name', 100)->nullable();
            $table->string('emergency_contact_phone', 20)->nullable();
            $table->string('emergency_contact_relation', 50)->nullable();
            $table->text('certifications')->nullable();
            $table->enum('employment_type', ['full-time', 'part-time', 'contract'])->default('full-time');
            $table->enum('status', ['active', 'inactive', 'on-leave', 'resigned', 'terminated'])->default('active');
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index('user_id');
            $table->index('employee_id');
            $table->index('status');
            $table->index('department');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('teachers');
    }
};

