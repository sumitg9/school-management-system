<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Exam extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'academic_year_id',
        'name',
        'code',
        'type',
        'start_date',
        'end_date',
        'description',
        'publish_results',
        'status',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'publish_results' => 'boolean',
    ];

    // Relationships
    public function academicYear()
    {
        return $this->belongsTo(AcademicYear::class);
    }

    public function schedules()
    {
        return $this->hasMany(ExamSchedule::class);
    }

    // Scopes
    public function scopeActive($query)
    {
        return $query->where('status', 'scheduled')->orWhere('status', 'ongoing');
    }

    public function scopeCompleted($query)
    {
        return $query->where('status', 'completed');
    }

    public function scopeUpcoming($query)
    {
        return $query->where('start_date', '>', now())->where('status', 'scheduled');
    }
}

