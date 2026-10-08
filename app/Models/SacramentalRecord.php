<?php

namespace App\Models;

use App\Enums\AnnotationTypeEnum;
use App\Enums\LegitimacyStatusEnum;
use App\Enums\SacramentTypeEnum;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class SacramentalRecord extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'person_id',
        'spouse_person_id',
        'sacrament_type',
        'event_date',
        'book_number',
        'page_number',
        'entry_number',
        'originating_parish_id',
        'performed_by_clergy_id',
        'legitimacy',
        'godparents',
        'witnesses',
        'place_of_event',
        'register_notes',
        'status',
        'voided_reason',
    ];

    protected function casts(): array
    {
        return [
            'sacrament_type' => SacramentTypeEnum::class,
            'legitimacy' => LegitimacyStatusEnum::class,
            'event_date' => 'date:Y-m-d',
            'book_number' => 'integer',
            'page_number' => 'integer',
            'entry_number' => 'integer',
        ];
    }

    protected static function booted(): void
    {
        // Canon 535 §1: Initial inscription is immutable.
        // Direct edits to transcribed identity, citation or date are forbidden.
        static::updating(function (SacramentalRecord $record) {
            $immutableFields = [
                'person_id',
                'spouse_person_id',
                'sacrament_type',
                'event_date',
                'book_number',
                'page_number',
                'entry_number',
                'originating_parish_id',
            ];

            foreach ($immutableFields as $field) {
                if ($record->isDirty($field) && $record->getOriginal($field) !== null) {
                    throw new \DomainException(
                        "Code of Canon Law Can. 535 Invariant: Canonical record #{$record->id} is immutable. Field '{$field}' cannot be directly modified. Add a CanonicalAnnotation instead."
                    );
                }
            }
        });
    }

    public function person(): BelongsTo
    {
        return $this->belongsTo(Person::class, 'person_id');
    }

    public function spouse(): BelongsTo
    {
        return $this->belongsTo(Person::class, 'spouse_person_id');
    }

    public function originatingParish(): BelongsTo
    {
        return $this->belongsTo(Parish::class, 'originating_parish_id');
    }

    public function performedByClergy(): BelongsTo
    {
        return $this->belongsTo(Clergy::class, 'performed_by_clergy_id');
    }

    public function annotations(): HasMany
    {
        return $this->hasMany(CanonicalAnnotation::class, 'record_id');
    }

    public function certificateRequests(): HasMany
    {
        return $this->hasMany(CertificateRequest::class, 'record_id');
    }

    public function accessLogs(): HasMany
    {
        return $this->hasMany(AccessLog::class, 'record_id');
    }

    public function getCitationAttribute(): string
    {
        return "Book {$this->book_number}, Page {$this->page_number}, Entry {$this->entry_number}";
    }

    public function addAnnotation(
        AnnotationTypeEnum $type,
        string $text,
        ?int $annotatedByUserId = null,
        ?string $eventDate = null,
        ?string $decreeReference = null,
        ?int $referenceRecordId = null
    ): CanonicalAnnotation {
        return $this->annotations()->create([
            'annotation_type' => $type,
            'note_text' => $text,
            'annotated_by_user_id' => $annotatedByUserId,
            'event_date' => $eventDate,
            'decree_reference' => $decreeReference,
            'reference_record_id' => $referenceRecordId,
            'annotated_at' => now(),
        ]);
    }
}
