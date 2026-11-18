<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations for the Online Admission Registration System.
     */
    public function up(): void
    {
        // 1. Admission Sessions Table
        if (!Schema::hasTable('admission_sessions')) {
            Schema::create('admission_sessions', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('school_id')->default(1)->index();
                $table->unsignedBigInteger('academic_year_id')->nullable()->index();
                $table->string('title', 255);
                $table->date('start_date');
                $table->date('end_date');
                $table->enum('status', ['draft', 'open', 'closed'])->default('open')->index();
                $table->text('description')->nullable();
                $table->timestamps();
                $table->softDeletes();
            });
        }

        // 2. Admission Settings Table
        if (!Schema::hasTable('admission_settings')) {
            Schema::create('admission_settings', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('school_id')->default(1)->unique();
                $table->boolean('online_admissions_enabled')->default(true);
                $table->date('opening_date')->nullable();
                $table->date('closing_date')->nullable();
                $table->unsignedBigInteger('active_session_id')->nullable();
                $table->json('eligible_classes')->nullable();
                $table->json('class_seat_capacities')->nullable();
                $table->decimal('registration_fee', 10, 2)->default(0.00);
                $table->boolean('fee_mandatory')->default(false);
                $table->string('application_number_prefix', 20)->default('ADM');
                $table->json('required_documents')->nullable();
                $table->text('instructions')->nullable();
                $table->text('declaration_text')->nullable();
                $table->timestamps();
            });
        }

        // 3. Admission Applications Table
        if (!Schema::hasTable('admission_applications')) {
            Schema::create('admission_applications', function (Blueprint $table) {
                $table->id();
                $table->uuid('uuid')->unique();
                $table->unsignedBigInteger('school_id')->default(1)->index();
                $table->unsignedBigInteger('session_id')->nullable()->index();
                $table->unsignedBigInteger('class_id')->index();
                $table->unsignedBigInteger('section_id')->nullable();
                $table->string('application_number', 50)->unique();
                $table->string('access_token', 100)->index();
                
                // Applicant Personal Details
                $table->string('first_name', 100);
                $table->string('last_name', 100)->nullable();
                $table->string('email', 255)->nullable()->index();
                $table->string('phone', 30)->nullable()->index();
                $table->date('date_of_birth');
                $table->enum('gender', ['male', 'female', 'other']);
                $table->string('blood_group', 10)->nullable();
                $table->string('nationality', 50)->default('Indian');
                $table->string('mother_tongue', 50)->nullable();
                $table->string('religion', 50)->nullable();
                $table->string('caste', 50)->nullable();
                $table->string('student_photo', 500)->nullable();
                $table->string('birth_certificate_number', 100)->nullable();

                // Residential Addresses
                $table->text('permanent_address')->nullable();
                $table->text('correspondence_address')->nullable();
                $table->string('city', 100)->nullable();
                $table->string('district', 100)->nullable();
                $table->string('state', 100)->nullable();
                $table->string('postal_code', 20)->nullable();
                $table->string('country', 100)->default('India');

                // Previous Academic History
                $table->string('previous_school', 255)->nullable();
                $table->string('previous_board', 100)->nullable();
                $table->string('previous_class', 50)->nullable();
                $table->string('previous_percentage', 20)->nullable();
                $table->string('transfer_certificate_number', 100)->nullable();
                $table->date('transfer_certificate_date')->nullable();

                // Status & Tracking
                $table->enum('status', [
                    'draft',
                    'submitted',
                    'under_review',
                    'documents_pending',
                    'verification_completed',
                    'approved',
                    'rejected',
                    'waitlisted',
                    'admission_confirmed',
                    'enrolled'
                ])->default('submitted')->index();

                $table->enum('payment_status', ['pending', 'completed', 'exempted', 'na'])->default('na')->index();
                $table->unsignedBigInteger('converted_student_id')->nullable()->index();

                // Audit metadata
                $table->timestamp('submitted_at')->nullable();
                $table->timestamp('reviewed_at')->nullable();
                $table->timestamp('enrolled_at')->nullable();
                $table->text('admin_remarks')->nullable();
                $table->text('rejection_reason')->nullable();
                $table->unsignedBigInteger('reviewed_by')->nullable();
                $table->unsignedBigInteger('enrolled_by')->nullable();

                $table->timestamps();
                $table->softDeletes();
            });
        }

        // 4. Admission Guardians Table
        if (!Schema::hasTable('admission_guardians')) {
            Schema::create('admission_guardians', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('application_id')->index();
                $table->string('father_name', 100)->nullable();
                $table->string('father_phone', 30)->nullable();
                $table->string('father_email', 255)->nullable();
                $table->string('father_occupation', 100)->nullable();
                $table->string('mother_name', 100)->nullable();
                $table->string('mother_phone', 30)->nullable();
                $table->string('mother_email', 255)->nullable();
                $table->string('mother_occupation', 100)->nullable();
                $table->string('guardian_name', 100)->nullable();
                $table->string('guardian_phone', 30)->nullable();
                $table->string('guardian_email', 255)->nullable();
                $table->string('guardian_relation', 50)->nullable();
                $table->string('guardian_occupation', 100)->nullable();
                $table->string('emergency_contact_name', 100)->nullable();
                $table->string('emergency_contact_phone', 30)->nullable();
                $table->string('emergency_contact_relation', 50)->nullable();
                $table->timestamps();
            });
        }

        // 5. Admission Documents Table
        if (!Schema::hasTable('admission_documents')) {
            Schema::create('admission_documents', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('application_id')->index();
                $table->string('document_type', 50); // photo, birth_cert, report_card, tc, address_proof
                $table->string('file_name', 255);
                $table->string('file_path', 500);
                $table->unsignedBigInteger('file_size')->default(0);
                $table->string('mime_type', 100)->default('application/pdf');
                $table->enum('verification_status', ['pending', 'verified', 'rejected'])->default('pending')->index();
                $table->text('verification_notes')->nullable();
                $table->unsignedBigInteger('verified_by')->nullable();
                $table->timestamp('verified_at')->nullable();
                $table->timestamps();
            });
        }

        // 6. Admission Status History Table
        if (!Schema::hasTable('admission_status_history')) {
            Schema::create('admission_status_history', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('application_id')->index();
                $table->string('from_status', 50)->nullable();
                $table->string('to_status', 50);
                $table->text('remarks')->nullable();
                $table->boolean('visible_to_applicant')->default(true);
                $table->unsignedBigInteger('changed_by')->nullable();
                $table->timestamp('created_at')->useCurrent();
            });
        }

        // 7. Admission Payments Table
        if (!Schema::hasTable('admission_payments')) {
            Schema::create('admission_payments', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('application_id')->index();
                $table->unsignedBigInteger('school_id')->default(1)->index();
                $table->decimal('amount', 10, 2);
                $table->string('currency', 10)->default('INR');
                $table->string('payment_method', 50)->default('online');
                $table->string('transaction_reference', 100)->nullable()->index();
                $table->string('gateway_payment_id', 100)->nullable();
                $table->enum('payment_status', ['pending', 'completed', 'failed', 'refunded'])->default('completed')->index();
                $table->string('receipt_number', 100)->unique();
                $table->timestamp('paid_at')->nullable();
                $table->timestamps();
            });
        }

        // Seed default admission setting if none exists
        if (Schema::hasTable('admission_settings') && DB::table('admission_settings')->count() === 0) {
            DB::table('admission_settings')->insert([
                'school_id' => 1,
                'online_admissions_enabled' => true,
                'opening_date' => now()->startOfYear()->toDateString(),
                'closing_date' => now()->endOfYear()->toDateString(),
                'registration_fee' => 500.00,
                'fee_mandatory' => false,
                'application_number_prefix' => 'ADM',
                'eligible_classes' => json_encode(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']),
                'class_seat_capacities' => json_encode([
                    '1' => 80, '2' => 80, '3' => 80, '4' => 80, '5' => 80,
                    '6' => 90, '7' => 90, '8' => 90, '9' => 90, '10' => 90,
                    '11' => 120, '12' => 120
                ]),
                'required_documents' => json_encode([
                    ['type' => 'student_photo', 'name' => 'Passport Size Photograph', 'mandatory' => true],
                    ['type' => 'birth_certificate', 'name' => 'Birth Certificate', 'mandatory' => true],
                    ['type' => 'previous_report_card', 'name' => 'Previous Class Report Card', 'mandatory' => false],
                    ['type' => 'transfer_certificate', 'name' => 'Transfer Certificate (TC)', 'mandatory' => false],
                    ['type' => 'address_proof', 'name' => 'Residential Address Proof', 'mandatory' => true],
                    ['type' => 'guardian_id', 'name' => 'Parent / Guardian ID Proof', 'mandatory' => false],
                ]),
                'instructions' => 'Welcome to the Online Admission Portal. Please ensure you have scanned copies of the student photograph, birth certificate, and address proof ready before commencing.',
                'declaration_text' => 'I hereby declare that all information furnished in this admission application is true, complete, and correct to the best of my knowledge.',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('admission_payments');
        Schema::dropIfExists('admission_status_history');
        Schema::dropIfExists('admission_documents');
        Schema::dropIfExists('admission_guardians');
        Schema::dropIfExists('admission_applications');
        Schema::dropIfExists('admission_settings');
        Schema::dropIfExists('admission_sessions');
    }
};

