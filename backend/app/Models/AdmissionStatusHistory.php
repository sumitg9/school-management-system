<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AdmissionStatusHistory extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $table = 'admission_status_history';

    protected $fillable = [
        'application_id',
        'from_status',
        'to_status',
        'remarks',
        'visible_to_applicant',
        'changed_by',
        'created_at',
    ];

    protected $casts = [
        'visible_to_applicant' => 'boolean',
        'created_at' => 'datetime',
    ];

    public function application()
    {
        return $this->belongsTo(AdmissionApplication::class, 'application_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'changed_by');
    }
}

