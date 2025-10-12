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
        Schema::create('grades', function (Blueprint $table) {
            $table->id();
            $table->foreignId('exam_id')->constrained()->onDelete('cascade');
            $table->foreignId('student_id')->constrained()->onDelete('cascade');
            $table->foreignId('subject_id')->constrained()->onDelete('cascade');
            $table->foreignId('class_id')->constrained('classes')->onDelete('cascade');
            $table->foreignId('section_id')->constrained()->onDelete('cascade');
            $table->decimal('marks_obtained', 5, 2);
            $table->decimal('total_marks', 5, 2);
            $table->string('grade', 5)->nullable(); // A+, A, B+, etc.
            $table->decimal('percentage', 5, 2)->nullable();
            $table->text('remarks')->nullable();
            $table->boolean('is_absent')->default(false);
            $table->foreignId('entered_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();

            $table->index('exam_id');
            $table->index('student_id');
            $table->index('subject_id');
            $table->index('class_id');
            $table->index('section_id');
            $table->unique(['exam_id', 'student_id', 'subject_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('grades');
    }
};

