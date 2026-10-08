<?php

namespace App\Enums;

enum DocumentRequestStatusEnum: string
{
    case SUBMITTED = 'submitted';
    case UNDER_REVIEW = 'under_review';
    case RECORD_NOT_FOUND = 'record_not_found';
    case PROCESSING = 'processing';
    case READY = 'ready';
    case OUT_FOR_DELIVERY = 'out_for_delivery';
    case COMPLETED = 'completed';
    case REJECTED = 'rejected';
    case CANCELLED = 'cancelled';

    public function label(): string
    {
        return match ($this) {
            self::SUBMITTED => 'Submitted',
            self::UNDER_REVIEW => 'Being Verified',
            self::RECORD_NOT_FOUND => 'Record Not Found',
            self::PROCESSING => 'Being Prepared',
            self::READY => 'Ready for Pickup',
            self::OUT_FOR_DELIVERY => 'Out for Delivery',
            self::COMPLETED => 'Completed',
            self::REJECTED => 'Rejected',
            self::CANCELLED => 'Cancelled',
        };
    }

    public function isOpen(): bool
    {
        return in_array($this, [
            self::SUBMITTED,
            self::UNDER_REVIEW,
            self::PROCESSING,
            self::READY,
            self::OUT_FOR_DELIVERY,
        ], true);
    }

    public function isClosed(): bool
    {
        return !$this->isOpen();
    }
}
