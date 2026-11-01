<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('settings', function (Blueprint $table) {
            $table->id();
            $table->string('key', 100)->unique();
            $table->text('value')->nullable();
            $table->string('group', 50)->default('general');
            $table->string('type', 30)->default('string');
            $table->string('description', 255)->nullable();
            $table->timestamps();

            $table->index('key');
            $table->index('group');
        });

        // Insert initial date time settings with default DD-MM-YYYY HH:mm:ss format
        DB::table('settings')->insert([
            [
                'key' => 'date_time_format',
                'value' => 'DD-MM-YYYY HH:mm:ss',
                'group' => 'localization',
                'type' => 'string',
                'description' => 'Global date time display format across the application',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'key' => 'date_format',
                'value' => 'DD-MM-YYYY',
                'group' => 'localization',
                'type' => 'string',
                'description' => 'Global date only display format across the application',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'key' => 'time_format',
                'value' => 'HH:mm:ss',
                'group' => 'localization',
                'type' => 'string',
                'description' => 'Global time only display format across the application',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'key' => 'timezone',
                'value' => 'Asia/Kolkata',
                'group' => 'localization',
                'type' => 'string',
                'description' => 'Application timezone',
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('settings');
    }
};

