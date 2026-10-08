<?php

namespace App\Models;

use App\Enums\DocumentRequestStatusEnum;
use App\Enums\SacramentTypeEnum;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class DocumentRequest extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'tracking_code',
        'parishioner_id',
        'targeted_parish_id',
        'sacrament_type',
        'name_on_record',
        'date_of_birth',
        'date_of_sacrament',
        'place_of_sacrament',
        'parents_or_spouse',
        'relationship_to_owner',
        'purpose',
        'status',
        'matched_record_id',
        'certificate_request_id',
        'id_document_path',
        'consent_given_at',
        'consent_version',
        'verification_hash',
        'rejection_reason',
        'cancellation_reason',
        'internal_note',
        'issued_at',
    ];

    protected function casts(): array
    {
        return [
            'sacrament_type' => SacramentTypeEnum::class,
            'status' => DocumentRequestStatusEnum::class,
            'date_of_birth' => 'date',
            'date_of_sacrament' => 'date',
            'consent_given_at' => 'datetime',
            'issued_at' => 'datetime',
        ];
    }

    public function parishioner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'parishioner_id');
    }

    public function targetedParish(): BelongsTo
    {
        return $this->belongsTo(Parish::class, 'targeted_parish_id');
    }

    public function matchedRecord(): BelongsTo
    {
        return $this->belongsTo(SacramentalRecord::class, 'matched_record_id');
    }

    public function certificateRequest(): BelongsTo
    {
        return $this->belongsTo(CertificateRequest::class, 'certificate_request_id');
    }

    public function getIsOpenAttribute(): bool
    {
        return $this->status instanceof DocumentRequestStatusEnum ? $this->status->isOpen() : false;
    }

    public function getIsMatchedAttribute(): bool
    {
        return $this->matched_record_id !== null;
    }

    public function wantsDescription(): string
    {
        $typeLabel = $this->sacrament_type instanceof SacramentTypeEnum
            ? $this->sacrament_type->label()
            : ucfirst((string)$this->sacrament_type);
        $year = $this->date_of_sacrament ? $this->date_of_sacrament->format('Y') : 'year unknown';
        return "{$typeLabel} — {$this->name_on_record} ({$year})";
    }
}
