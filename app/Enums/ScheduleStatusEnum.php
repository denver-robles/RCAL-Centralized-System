<?php

namespace App\Enums;

enum ScheduleStatusEnum: string
{
    case REQUESTED = 'requested';
    case SCHEDULED = 'scheduled';
    case CONFIRMED = 'confirmed';
    case COMPLETED = 'completed';
    case CANCELLED = 'cancelled';

    public function label(): string
    {
        return match ($this) {
            self::REQUESTED => 'Pending Approval',
            self::SCHEDULED => 'Scheduled',
            self::CONFIRMED => 'Confirmed',
            self::COMPLETED => 'Completed',
            self::CANCELLED => 'Cancelled',
        };
    }

    public function isOpen(): bool
    {
        return in_array($this, [self::REQUESTED, self::SCHEDULED, self::CONFIRMED], true);
    }
}
