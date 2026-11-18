<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AdmissionSetting extends Model
{
    use HasFactory;

    protected $table = 'admission_settings';

    protected $fillable = [
        'school_id',
        'online_admissions_enabled',
        'opening_date',
        'closing_date',
        'active_session_id',
        'eligible_classes',
        'class_seat_capacities',
        'registration_fee',
        'fee_mandatory',
        'application_number_prefix',
        'required_documents',
        'instructions',
        'declaration_text',
    ];

    protected $casts = [
        'online_admissions_enabled' => 'boolean',
        'fee_mandatory' => 'boolean',
        'registration_fee' => 'decimal:2',
        'opening_date' => 'date:Y-m-d',
        'closing_date' => 'date:Y-m-d',
        'eligible_classes' => 'array',
        'class_seat_capacities' => 'array',
        'required_documents' => 'array',
    ];

    public function school()
    {
        return $this->belongsTo(School::class, 'school_id');
    }
}

