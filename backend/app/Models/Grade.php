<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\Exam;
use App\Models\Subject;
use App\Models\ClassModel;
use App\Models\Section;

class Grade extends Model
{
    use HasFactory;

    protected $fillable = [
        'exam_id',
        'student_id',
        'subject_id',
        'class_id',
        'section_id',
        'marks_obtained',
        'total_marks',
        'grade',
        'percentage',
        'remarks',
        'is_absent',
        'entered_by',
    ];

    protected $casts = [
        'marks_obtained' => 'decimal:2',
        'total_marks' => 'decimal:2',
        'percentage' => 'decimal:2',
    ];

    // Relationships
    public function exam()
    {
        return $this->belongsTo(Exam::class);
    }

    public function student()
    {
        return $this->belongsTo(Student::class);
    }

    public function subject()
    {
        return $this->belongsTo(Subject::class);
    }

    public function class()
    {
        return $this->belongsTo(ClassModel::class, 'class_id');
    }

    public function section()
    {
        return $this->belongsTo(Section::class);
    }

    public function enteredBy()
    {
        return $this->belongsTo(User::class, 'entered_by');
    }
}

