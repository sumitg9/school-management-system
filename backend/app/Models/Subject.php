<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Subject extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name',
        'code',
        'type',
        'total_marks',
        'passing_marks',
        'description',
        'status',
    ];

    protected $casts = [
        'total_marks' => 'integer',
        'passing_marks' => 'integer',
    ];

    // Relationships
    public function classes()
    {
        return $this->belongsToMany(ClassModel::class, 'class_subject', 'subject_id', 'class_id')
            ->withPivot('is_elective', 'total_marks', 'passing_marks')
            ->withTimestamps();
    }

    public function assignments()
    {
        return $this->hasMany(Assignment::class);
    }

    public function examSchedules()
    {
        return $this->hasMany(ExamSchedule::class);
    }

    // Scopes
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    public function scopeTheory($query)
    {
        return $query->whereIn('type', ['theory', 'both']);
    }

    public function scopePractical($query)
    {
        return $query->whereIn('type', ['practical', 'both']);
    }
}

