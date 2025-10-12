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
        Schema::create('parents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('father_name', 100)->nullable();
            $table->string('father_phone', 20)->nullable();
            $table->string('father_email', 100)->nullable();
            $table->string('father_occupation', 100)->nullable();
            $table->string('father_annual_income', 50)->nullable();
            $table->string('mother_name', 100)->nullable();
            $table->string('mother_phone', 20)->nullable();
            $table->string('mother_email', 100)->nullable();
            $table->string('mother_occupation', 100)->nullable();
            $table->string('mother_annual_income', 50)->nullable();
            $table->string('guardian_name', 100)->nullable();
            $table->string('guardian_phone', 20)->nullable();
            $table->string('guardian_email', 100)->nullable();
            $table->string('guardian_relation', 50)->nullable();
            $table->enum('status', ['active', 'inactive'])->default('active');
            $table->timestamps();
            $table->softDeletes();

            $table->index('user_id');
            $table->index('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('parents');
    }
};

