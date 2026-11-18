<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class AdmissionSession extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'admission_sessions';

    protected $fillable = [
        'school_id',
        'academic_year_id',
        'title',
        'start_date',
        'end_date',
        'status',
        'description',
    ];

    protected $casts = [
        'start_date' => 'date:Y-m-d',
        'end_date' => 'date:Y-m-d',
    ];

    public function school()
    {
        return $this->belongsTo(School::class, 'school_id');
    }

    public function academicYear()
    {
        return $this->belongsTo(AcademicYear::class, 'academic_year_id');
    }

    public function applications()
    {
        return $this->hasMany(AdmissionApplication::class, 'session_id');
    }
}

