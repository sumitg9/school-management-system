<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class ParentModel extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'parents';

    protected $fillable = [
        'user_id',
        'father_name',
        'father_phone',
        'father_email',
        'father_occupation',
        'father_annual_income',
        'mother_name',
        'mother_phone',
        'mother_email',
        'mother_occupation',
        'mother_annual_income',
        'guardian_name',
        'guardian_phone',
        'guardian_email',
        'guardian_relation',
        'status',
    ];

    // Relationships
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function students()
    {
        return $this->belongsToMany(Student::class, 'parent_student')
            ->withPivot('relation', 'is_primary')
            ->withTimestamps();
    }

    // Scopes
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }
}

