<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Teacher extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'user_id',
        'employee_id',
        'first_name',
        'last_name',
        'joining_date',
        'qualification',
        'specialization',
        'experience_years',
        'designation',
        'department',
        'salary',
        'bank_account_number',
        'bank_name',
        'bank_ifsc',
        'emergency_contact_name',
        'emergency_contact_phone',
        'emergency_contact_relation',
        'certifications',
        'employment_type',
        'status',
        'notes',
    ];

    protected $casts = [
        'joining_date' => 'date',
        'experience_years' => 'decimal:1',
        'salary' => 'decimal:2',
    ];

    // Relationships
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function assignments()
    {
        return $this->hasMany(Assignment::class);
    }

    // Scopes
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    public function scopeByDepartment($query, $department)
    {
        return $query->where('department', $department);
    }

    // Accessors
    public function getFullNameAttribute()
    {
        return $this->first_name . ' ' . $this->last_name;
    }
}

