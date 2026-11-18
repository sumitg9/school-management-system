<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AdmissionPayment extends Model
{
    use HasFactory;

    protected $table = 'admission_payments';

    protected $fillable = [
        'application_id',
        'school_id',
        'amount',
        'currency',
        'payment_method',
        'transaction_reference',
        'gateway_payment_id',
        'payment_status',
        'receipt_number',
        'paid_at',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'paid_at' => 'datetime',
    ];

    public function application()
    {
        return $this->belongsTo(AdmissionApplication::class, 'application_id');
    }

    public function school()
    {
        return $this->belongsTo(School::class, 'school_id');
    }
}

