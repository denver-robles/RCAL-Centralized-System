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
        'expected_attendees',
        'record_id',
        'cancellation_reason',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'sacrament_type' => ScheduleTypeEnum::class,
            'status' => ScheduleStatusEnum::class,
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
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

    public function requesterUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requester_user_id');
    }

    public function record(): BelongsTo
    {
        return $this->belongsTo(SacramentalRecord::class, 'record_id');
    }

    public function getDurationMinutesAttribute(): int
    {
        if (!$this->starts_at || !$this->ends_at) {
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
}
