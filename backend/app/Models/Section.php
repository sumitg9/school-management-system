<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Section extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'class_id',
        'name',
        'capacity',
        'current_strength',
        'description',
        'status',
    ];

    protected $casts = [
        'capacity' => 'integer',
        'current_strength' => 'integer',
    ];

    // Relationships
    public function class()
    {
        return $this->belongsTo(ClassModel::class, 'class_id');
    }

    public function students()
    {
        return $this->hasMany(Student::class);
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

    // Accessors
    public function getFullNameAttribute()
    {
        return $this->class->name . ' - ' . $this->name;
    }

    public function getAvailableSeatsAttribute()
    {
        return $this->capacity - $this->current_strength;
    }
}

