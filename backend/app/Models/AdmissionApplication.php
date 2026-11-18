<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class AdmissionApplication extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'admission_applications';

    protected $fillable = [
        'uuid',
        'school_id',
        'session_id',
        'class_id',
        'section_id',
        'application_number',
        'access_token',
        'first_name',
        'last_name',
        'email',
        'phone',
        'date_of_birth',
        'gender',
        'blood_group',
        'nationality',
        'mother_tongue',
        'religion',
        'caste',
        'student_photo',
        'birth_certificate_number',
        'permanent_address',
        'correspondence_address',
        'city',
        'district',
        'state',
        'postal_code',
        'country',
        'previous_school',
        'previous_board',
        'previous_class',
        'previous_percentage',
        'transfer_certificate_number',
        'transfer_certificate_date',
        'status',
        'payment_status',
        'converted_student_id',
        'submitted_at',
        'reviewed_at',
        'enrolled_at',
        'admin_remarks',
        'rejection_reason',
        'reviewed_by',
        'enrolled_by',
    ];

    protected $casts = [
        'date_of_birth' => 'date:Y-m-d',
        'transfer_certificate_date' => 'date:Y-m-d',
        'submitted_at' => 'datetime',
        'reviewed_at' => 'datetime',
        'enrolled_at' => 'datetime',
    ];

    protected $appends = [
        'full_name',
    ];

    public function getFullNameAttribute(): string
    {
        return trim("{$this->first_name} {$this->last_name}");
    }

    public function school()
    {
        return $this->belongsTo(School::class, 'school_id');
    }

    public function class()
    {
        return $this->belongsTo(ClassModel::class, 'class_id');
    }

    public function section()
    {
        return $this->belongsTo(Section::class, 'section_id');
    }

    public function guardians()
    {
        return $this->hasOne(AdmissionGuardian::class, 'application_id');
    }

    public function documents()
    {
        return $this->hasMany(AdmissionDocument::class, 'application_id');
    }

    public function statusHistory()
    {
        return $this->hasMany(AdmissionStatusHistory::class, 'application_id')->orderBy('created_at', 'desc');
    }

    public function payments()
    {
        return $this->hasMany(AdmissionPayment::class, 'application_id');
    }

    public function convertedStudent()
    {
        return $this->belongsTo(Student::class, 'converted_student_id');
    }
}

