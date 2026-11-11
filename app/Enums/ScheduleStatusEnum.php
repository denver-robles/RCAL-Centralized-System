<?php

namespace App\Enums;

enum ScheduleStatusEnum: string
{
    case REQUESTED = 'requested';
    case ON_HOLD = 'on_hold';
    case PROCESSING = 'processing';
    case SCHEDULED = 'scheduled';
    case CONFIRMED = 'confirmed';
    case COMPLETED = 'completed';
    case CANCELLED = 'cancelled';

    public function label(): string
    {
        return match ($this) {
            self::REQUESTED => 'Pending Approval',
            self::ON_HOLD => 'On Hold',
            self::PROCESSING => 'Processing',
            self::SCHEDULED => 'Scheduled',
            self::CONFIRMED => 'Confirmed',
            self::COMPLETED => 'Completed',
            self::CANCELLED => 'Cancelled',
        };
    }

    public function isOpen(): bool
    {
        return in_array($this, [
            self::REQUESTED,
            self::ON_HOLD,
            self::PROCESSING,
            self::SCHEDULED,
            self::CONFIRMED,
        ], true);
    }
}
