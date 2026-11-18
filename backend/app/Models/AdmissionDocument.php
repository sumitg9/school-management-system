<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AdmissionDocument extends Model
{
    use HasFactory;

    protected $table = 'admission_documents';

    protected $fillable = [
        'application_id',
        'document_type',
        'file_name',
        'file_path',
        'file_size',
        'mime_type',
        'verification_status',
        'verification_notes',
        'verified_by',
        'verified_at',
    ];

    protected $casts = [
        'verified_at' => 'datetime',
        'file_size' => 'integer',
    ];

    public function application()
    {
        return $this->belongsTo(AdmissionApplication::class, 'application_id');
    }

    public function verifier()
    {
        return $this->belongsTo(User::class, 'verified_by');
    }
}

