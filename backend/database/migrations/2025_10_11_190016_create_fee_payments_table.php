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
        Schema::create('fee_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained()->onDelete('cascade');
            $table->foreignId('fee_structure_id')->constrained()->onDelete('restrict');
            $table->string('receipt_number', 50)->unique();
            $table->decimal('amount', 10, 2);
            $table->decimal('discount', 10, 2)->default(0);
            $table->decimal('fine', 10, 2)->default(0);
            $table->decimal('total_amount', 10, 2);
            $table->date('payment_date');
            $table->enum('payment_method', ['cash', 'check', 'card', 'online', 'bank-transfer'])->default('cash');
            $table->string('transaction_id', 100)->nullable();
            $table->text('remarks')->nullable();
            $table->enum('status', ['pending', 'completed', 'failed', 'refunded'])->default('completed');
            $table->foreignId('collected_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();
            $table->softDeletes();

            $table->index('student_id');
            $table->index('fee_structure_id');
            $table->index('receipt_number');
            $table->index('payment_date');
            $table->index('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('fee_payments');
    }
};

