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
        // Drop the PostgreSQL check constraint on fee_structures.type
        // to allow custom fee types and expanded categories beyond the original 6 enum values
        DB::statement('ALTER TABLE fee_structures DROP CONSTRAINT IF EXISTS fee_structures_type_check;');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement("ALTER TABLE fee_structures ADD CONSTRAINT fee_structures_type_check CHECK (type::text = ANY (ARRAY['tuition'::character varying, 'transport'::character varying, 'library'::character varying, 'sports'::character varying, 'exam'::character varying, 'other'::character varying]::text[]));");
    }
};

