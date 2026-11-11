<?php

namespace App\Models;

use App\Enums\ScheduleStatusEnum;
use App\Enums\ScheduleTypeEnum;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class SacramentSchedule extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'parish_id',
        'venue_id',
        'presiding_clergy_id',
        'requester_user_id',
        'sacrament_type',
        'title',
        'description',
        'starts_at',
        'ends_at',
        'status',
        'requester_name',
        'requester_contact',
        'requester_email',
        'requester_relationship',
        'requester_address',
        'alternative_starts_at',
        'specific_data',
        'payment_method',
        'payment_receipt_path',
        'payment_status',
        'expected_attendees',
        'record_id',
        'cancellation_reason',
        'notes',
        'certificate_submission_mode',
        'requested_clergy_id',
        'staff_notes',
        'document_checklist',
    ];

    protected function casts(): array
    {
        return [
            'sacrament_type' => ScheduleTypeEnum::class,
            'status' => ScheduleStatusEnum::class,
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
            'alternative_starts_at' => 'datetime',
            'specific_data' => 'array',
            'document_checklist' => 'array',
            'expected_attendees' => 'integer',
        ];
    }

    public function parish(): BelongsTo
    {
        return $this->belongsTo(Parish::class);
    }

    public function venue(): BelongsTo
    {
        return $this->belongsTo(Venue::class);
    }

    public function presidingClergy(): BelongsTo
    {
        return $this->belongsTo(Clergy::class, 'presiding_clergy_id');
    }

    public function requestedClergy(): BelongsTo
    {
        return $this->belongsTo(Clergy::class, 'requested_clergy_id');
    }

    public function requesterUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requester_user_id');
    }

    public function record(): BelongsTo
    {
        return $this->belongsTo(SacramentalRecord::class, 'record_id');
    }

    public function attachments()
    {
        return $this->hasMany(ScheduleAttachment::class, 'sacrament_schedule_id');
    }

    protected $appends = [
        'duration_minutes',
        'is_past',
        'needs_register_entry',
        'formatted_time',
        'formatted_date',
        'baptism_type',
        'amount',
        'donation_amount',
    ];

    /**
     * Prepare a date for array / JSON serialization.
     * Use local ISO format without trailing 'Z' so client browsers do not incorrectly shift
     * local church wall-clock appointment times by their timezone offset.
     */
    protected function serializeDate(\DateTimeInterface $date): string
    {
        return $date->format('Y-m-d\TH:i:s');
    }

    public function getFormattedTimeAttribute(): string
    {
        if (! $this->starts_at) {
            return 'Pending Assignment';
        }

        $start = $this->starts_at->format('g:i A');
        if ($this->ends_at) {
            return $start.' – '.$this->ends_at->format('g:i A');
        }

        return $start;
    }

    public function getFormattedDateAttribute(): string
    {
        return $this->starts_at ? $this->starts_at->format('D, M j, Y') : 'Pending Assignment';
    }

    public function getDurationMinutesAttribute(): int
    {
        if (! $this->starts_at || ! $this->ends_at) {
            return 0;
        }

        return max(0, $this->starts_at->diffInMinutes($this->ends_at));
    }

    public function getIsPastAttribute(): bool
    {
        return $this->ends_at && $this->ends_at->isPast();
    }

    public function getNeedsRegisterEntryAttribute(): bool
    {
        $isSacrament = $this->sacrament_type instanceof ScheduleTypeEnum
            ? $this->sacrament_type->isSacrament()
            : false;

        return $isSacrament
            && $this->status === ScheduleStatusEnum::COMPLETED
            && $this->record_id === null;
    }

    public function getBaptismTypeAttribute(): ?string
    {
        return $this->specific_data['baptism_type'] ?? null;
    }

    public function getAmountAttribute(): ?float
    {
        $val = $this->specific_data['amount'] ?? ($this->specific_data['donation_amount'] ?? null);

        return $val !== null && $val !== '' ? (float) $val : null;
    }

    public function getDonationAmountAttribute(): ?float
    {
        return $this->amount;
    }
}
