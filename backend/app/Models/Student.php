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
        'admission_date' => 'date:Y-m-d',
    ];

    protected $appends = [
        'full_name',
        'email',
        'phone',
        'gender',
        'date_of_birth',
        'address',
        'city',
        'state',
        'country',
        'postal_code',
        'father_name',
        'father_phone',
        'father_occupation',
        'mother_name',
        'mother_phone',
        'mother_occupation',
        'guardian_name',
        'guardian_phone',
        'guardian_relation',
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
        return trim($this->first_name . ' ' . $this->last_name);
    }

    public function getEmailAttribute()
    {
        return $this->user?->email;
    }

    public function getPhoneAttribute()
    {
        return $this->user?->phone;
    }

    public function getGenderAttribute()
    {
        return $this->user?->gender;
    }

    public function getDateOfBirthAttribute()
    {
        $dob = $this->user?->date_of_birth;
        if (!$dob) {
            return null;
        }
        return is_string($dob) ? substr($dob, 0, 10) : $dob->format('Y-m-d');
    }

    public function getAddressAttribute()
    {
        return $this->user?->address;
    }

    public function getCityAttribute()
    {
        return $this->user?->city;
    }

    public function getStateAttribute()
    {
        return $this->user?->state;
    }

    public function getCountryAttribute()
    {
        return $this->user?->country;
    }

    public function getPostalCodeAttribute()
    {
        return $this->user?->postal_code;
    }

    public function getPrimaryParentAttribute()
    {
        if ($this->relationLoaded('parents')) {
            return $this->parents->first();
        }
        return null;
    }

    public function getFatherNameAttribute()
    {
        return $this->primary_parent?->father_name;
    }

    public function getFatherPhoneAttribute()
    {
        return $this->primary_parent?->father_phone;
    }

    public function getFatherOccupationAttribute()
    {
        return $this->primary_parent?->father_occupation;
    }

    public function getMotherNameAttribute()
    {
        return $this->primary_parent?->mother_name;
    }

    public function getMotherPhoneAttribute()
    {
        return $this->primary_parent?->mother_phone;
    }

    public function getMotherOccupationAttribute()
    {
        return $this->primary_parent?->mother_occupation;
    }

    public function getGuardianNameAttribute()
    {
        return $this->primary_parent?->guardian_name;
    }

    public function getGuardianPhoneAttribute()
    {
        return $this->primary_parent?->guardian_phone;
    }

    public function getGuardianRelationAttribute()
    {
        return $this->primary_parent?->guardian_relation;
    }
}

