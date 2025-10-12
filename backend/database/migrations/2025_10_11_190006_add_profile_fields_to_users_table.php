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
        Schema::table('users', function (Blueprint $table) {
            $table->string('phone', 20)->nullable()->after('email');
            $table->string('avatar')->nullable()->after('phone');
            $table->date('date_of_birth')->nullable()->after('avatar');
            $table->enum('gender', ['male', 'female', 'other'])->nullable()->after('date_of_birth');
            $table->text('address')->nullable()->after('gender');
            $table->string('city', 100)->nullable()->after('address');
            $table->string('state', 100)->nullable()->after('city');
            $table->string('country', 100)->default('USA')->after('state');
            $table->string('postal_code', 20)->nullable()->after('country');
            $table->enum('status', ['active', 'inactive', 'suspended'])->default('active')->after('postal_code');
            $table->timestamp('last_login_at')->nullable()->after('status');
            $table->softDeletes()->after('updated_at');

            $table->index('phone');
            $table->index('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'phone', 'avatar', 'date_of_birth', 'gender', 
                'address', 'city', 'state', 'country', 'postal_code',
                'status', 'last_login_at', 'deleted_at'
            ]);
        });
    }
};

