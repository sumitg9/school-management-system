<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AssignmentSubmission extends Model
{
    use HasFactory;

    protected $fillable = [
        'assignment_id',
        'student_id',
        'submission_text',
        'attachment',
        'submitted_at',
        'marks_obtained',
        'feedback',
        'graded_at',
        'graded_by',
        'status',
    ];

    protected $casts = [
        'submitted_at' => 'datetime',
        'graded_at' => 'datetime',
        'marks_obtained' => 'decimal:2',
    ];

    // Relationships
    public function assignment()
    {
        return $this->belongsTo(Assignment::class);
    }

    public function student()
    {
        return $this->belongsTo(Student::class);
    }

    public function gradedBy()
    {
        return $this->belongsTo(User::class, 'graded_by');
    }

    // Scopes
    public function scopeSubmitted($query)
    {
        return $query->where('status', 'submitted')->orWhere('status', 'graded');
    }

    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function scopeGraded($query)
    {
        return $query->where('status', 'graded');
    }
}

