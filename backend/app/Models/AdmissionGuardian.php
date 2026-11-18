<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AdmissionGuardian extends Model
{
    use HasFactory;

    protected $table = 'admission_guardians';

    protected $fillable = [
        'application_id',
        'father_name',
        'father_phone',
        'father_email',
        'father_occupation',
        'mother_name',
        'mother_phone',
        'mother_email',
        'mother_occupation',
        'guardian_name',
        'guardian_phone',
        'guardian_email',
        'guardian_relation',
        'guardian_occupation',
        'emergency_contact_name',
        'emergency_contact_phone',
        'emergency_contact_relation',
    ];

    public function application()
    {
        return $this->belongsTo(AdmissionApplication::class, 'application_id');
    }
}

