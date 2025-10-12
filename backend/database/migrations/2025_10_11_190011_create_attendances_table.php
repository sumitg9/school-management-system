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
        Schema::create('attendances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained()->onDelete('cascade');
            $table->foreignId('class_id')->constrained()->onDelete('restrict');
            $table->foreignId('section_id')->constrained()->onDelete('restrict');
            $table->date('date');
            $table->enum('status', ['present', 'absent', 'late', 'half-day', 'on-leave'])->default('present');
            $table->time('check_in_time')->nullable();
            $table->time('check_out_time')->nullable();
            $table->text('remarks')->nullable();
            $table->foreignId('marked_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();

            $table->unique(['student_id', 'date']);
            $table->index('student_id');
            $table->index('class_id');
            $table->index('section_id');
            $table->index('date');
            $table->index('status');
            $table->index(['class_id', 'section_id', 'date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('attendances');
    }
};

