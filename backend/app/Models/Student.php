<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Student extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'user_id',
        'academic_year_id',
        'class_id',
        'section_id',
        'admission_number',
        'admission_date',
        'first_name',
        'last_name',
        'roll_number',
        'blood_group',
        'religion',
        'caste',
        'nationality',
        'mother_tongue',
        'previous_school',
        'medical_conditions',
        'allergies',
        'emergency_contact_name',
        'emergency_contact_phone',
        'emergency_contact_relation',
        'status',
        'notes',
    ];

    protected $casts = [
        'admission_date' => 'date',
    ];

    // Relationships
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function academicYear()
    {
        return $this->belongsTo(AcademicYear::class);
    }

    public function class()
    {
        return $this->belongsTo(ClassModel::class, 'class_id');
    }

    public function section()
    {
        return $this->belongsTo(Section::class);
    }

    public function parents()
    {
        return $this->belongsToMany(ParentModel::class, 'parent_student', 'student_id', 'parent_id')
            ->withPivot('relation', 'is_primary')
            ->withTimestamps();
    }

    public function attendances()
    {
        return $this->hasMany(Attendance::class);
    }

    public function grades()
    {
        return $this->hasMany(Grade::class);
    }

    public function feePayments()
    {
        return $this->hasMany(FeePayment::class);
    }

    public function assignmentSubmissions()
    {
        return $this->hasMany(AssignmentSubmission::class);
    }

    // Scopes
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    public function scopeInClass($query, $classId)
    {
        return $query->where('class_id', $classId);
    }

    public function scopeInSection($query, $sectionId)
    {
        return $query->where('section_id', $sectionId);
    }

    // Accessors
    public function getFullNameAttribute()
    {
        return $this->first_name . ' ' . $this->last_name;
    }
}

