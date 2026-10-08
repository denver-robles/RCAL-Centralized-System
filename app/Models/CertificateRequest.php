<?php

namespace App\Models;

use App\Enums\RequestStatusEnum;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class CertificateRequest extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'record_id',
        'requester_user_id',
        'requester_name',
        'requester_contact',
        'purpose',
        'status',
        'certificate_number',
        'verification_token',
        'verified_by_user_id',
        'verified_at',
        'approved_by_user_id',
        'approved_at',
        'issued_by_user_id',
        'issued_at',
        'rejected_by_user_id',
        'rejected_at',
        'rejection_reason',
    ];

    protected function casts(): array
    {
        return [
            'status' => RequestStatusEnum::class,
            'verified_at' => 'datetime',
            'approved_at' => 'datetime',
            'issued_at' => 'datetime',
            'rejected_at' => 'datetime',
        ];
    }

    public function record(): BelongsTo
    {
        return $this->belongsTo(SacramentalRecord::class, 'record_id');
    }

    public function requesterUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requester_user_id');
    }

    public function verifiedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verified_by_user_id');
    }

    public function approvedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by_user_id');
    }

    public function issuedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'issued_by_user_id');
    }

    public function rejectedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'rejected_by_user_id');
    }

    public function linkedDocumentRequest(): HasOne
    {
        return $this->hasOne(DocumentRequest::class, 'certificate_request_id');
    }

    public function getIsOpenAttribute(): bool
    {
        return $this->status instanceof RequestStatusEnum ? $this->status->isOpen() : false;
    }
}
