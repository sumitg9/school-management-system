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
        Schema::create('fee_structures', function (Blueprint $table) {
            $table->id();
            $table->foreignId('academic_year_id')->constrained()->onDelete('cascade');
            $table->foreignId('class_id')->constrained()->onDelete('cascade');
            $table->string('name', 100); // e.g., "Tuition Fee", "Transport Fee"
            $table->enum('type', ['tuition', 'transport', 'library', 'sports', 'exam', 'other'])->default('tuition');
            $table->decimal('amount', 10, 2);
            $table->enum('frequency', ['one-time', 'monthly', 'quarterly', 'half-yearly', 'yearly'])->default('yearly');
            $table->date('due_date')->nullable();
            $table->boolean('is_mandatory')->default(true);
            $table->text('description')->nullable();
            $table->enum('status', ['active', 'inactive'])->default('active');
            $table->timestamps();
            $table->softDeletes();

            $table->index('academic_year_id');
            $table->index('class_id');
            $table->index('type');
            $table->index('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('fee_structures');
    }
};

