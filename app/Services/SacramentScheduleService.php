<?php

namespace App\Services;

use App\Enums\ScheduleStatusEnum;
use App\Enums\ScheduleTypeEnum;
use App\Models\SacramentSchedule;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Validation\ValidationException;

class SacramentScheduleService
{
    /**
     * Checks for scheduling conflicts within a given time window (FR-2.2).
     * Strict half-open comparison: existing.starts_at < new.ends_at AND existing.ends_at > new.starts_at.
     * Back-to-back events (10:00-11:00 and 11:00-12:00) do NOT clash.
     */
    public function detectConflicts(
        Carbon|string $startsAt,
        Carbon|string $endsAt,
        int $parishId,
        ?int $venueId = null,
        ?int $clergyId = null,
        ?int $excludeScheduleId = null
    ): Collection {
        if (!$venueId && !$clergyId) {
            return new Collection();
        }

        $query = SacramentSchedule::where('parish_id', $parishId)
            ->whereIn('status', [ScheduleStatusEnum::SCHEDULED, ScheduleStatusEnum::CONFIRMED])
            ->where('starts_at', '<', $endsAt)
            ->where('ends_at', '>', $startsAt);

        if ($excludeScheduleId) {
            $query->where('id', '!=', $excludeScheduleId);
        }

        $query->where(function ($q) use ($venueId, $clergyId) {
            if ($venueId && $clergyId) {
                $q->where('venue_id', $venueId)
                  ->orWhere('presiding_clergy_id', $clergyId);
            } elseif ($venueId) {
                $q->where('venue_id', $venueId);
            } elseif ($clergyId) {
                $q->where('presiding_clergy_id', $clergyId);
            }
        });

        return $query->with(['venue', 'presidingClergy'])->get();
    }

    /**
     * Formulates human-readable conflict explanation.
     */
    public function describeConflict(SacramentSchedule $schedule, ?int $venueId = null, ?int $clergyId = null): string
    {
        $reasons = [];
        if ($venueId && $schedule->venue_id === $venueId && $schedule->venue) {
            $reasons[] = "{$schedule->venue->name} is already booked";
        }
        if ($clergyId && $schedule->presiding_clergy_id === $clergyId && $schedule->presidingClergy) {
            $reasons[] = "{$schedule->presidingClergy->titled_name} is already officiating";
        }
        if (empty($reasons)) {
            $reasons[] = 'Time interval overlaps an existing schedule';
        }

        $timeWindow = $schedule->starts_at->format('d M Y H:i') . '–' . $schedule->ends_at->format('H:i');
        return implode('; ', $reasons) . " ({$timeWindow}): {$schedule->title}";
    }

    /**
     * Validates and schedules a sacrament appointment.
     * Enforces the non-negotiable invariant: ZERO Mass Intentions.
     */
    public function bookSacrament(array $data, ?User $actor = null): SacramentSchedule
    {
        // Non-negotiable invariant check
        $type = $data['sacrament_type'] ?? '';
        if (is_string($type) && str_contains(strtolower($type), 'intention')) {
            throw new \DomainException('Strict Prohibition: Mass Intentions are forbidden by RCAL project guidelines.');
        }

        $startsAt = Carbon::parse($data['starts_at']);
        $endsAt = Carbon::parse($data['ends_at']);

        if ($endsAt->lte($startsAt)) {
            throw ValidationException::withMessages([
                'ends_at' => 'End time must be after the start time.',
            ]);
        }

        $conflicts = $this->detectConflicts(
            $startsAt,
            $endsAt,
            (int)$data['parish_id'],
            isset($data['venue_id']) ? (int)$data['venue_id'] : null,
            isset($data['presiding_clergy_id']) ? (int)$data['presiding_clergy_id'] : null
        );

        if ($conflicts->isNotEmpty()) {
            $desc = $this->describeConflict(
                $conflicts->first(),
                isset($data['venue_id']) ? (int)$data['venue_id'] : null,
                isset($data['presiding_clergy_id']) ? (int)$data['presiding_clergy_id'] : null
            );
            throw ValidationException::withMessages([
                'starts_at' => "Schedule conflict detected: {$desc}",
            ]);
        }

        return SacramentSchedule::create([
            'parish_id' => $data['parish_id'],
            'venue_id' => $data['venue_id'] ?? null,
            'presiding_clergy_id' => $data['presiding_clergy_id'] ?? null,
            'requester_user_id' => $data['requester_user_id'] ?? $actor?->id,
            'sacrament_type' => $data['sacrament_type'],
            'title' => $data['title'],
            'description' => $data['description'] ?? null,
            'starts_at' => $startsAt,
            'ends_at' => $endsAt,
            'status' => $data['status'] ?? ScheduleStatusEnum::SCHEDULED,
            'requester_name' => $data['requester_name'] ?? null,
            'requester_contact' => $data['requester_contact'] ?? null,
            'expected_attendees' => $data['expected_attendees'] ?? null,
        ]);
    }
}
