<?php

namespace App\Enums;

enum RequestStatusEnum: string
{
    case PENDING = 'pending';
    case VERIFIED = 'verified';
    case APPROVED = 'approved';
    case AWAITING_PAYMENT = 'awaiting_payment';
    case PROCESSING = 'processing';
    case READY = 'ready';
    case OUT_FOR_DELIVERY = 'out_for_delivery';
    case ISSUED = 'issued';
    case REJECTED = 'rejected';
    case CANCELLED = 'cancelled';

    public function label(): string
    {
        return match ($this) {
            self::PENDING => 'Pending Verification',
            self::VERIFIED => 'Verified',
            self::APPROVED => 'Approved',
            self::AWAITING_PAYMENT => 'Awaiting Payment',
            self::PROCESSING => 'Processing',
            self::READY => 'Ready for Pickup',
            self::OUT_FOR_DELIVERY => 'Out for Delivery',
            self::ISSUED => 'Completed / Issued',
            self::REJECTED => 'Rejected',
            self::CANCELLED => 'Cancelled',
        };
    }

    public function isOpen(): bool
    {
        return in_array($this, [
            self::PENDING,
            self::VERIFIED,
            self::APPROVED,
            self::AWAITING_PAYMENT,
            self::PROCESSING,
            self::READY,
            self::OUT_FOR_DELIVERY,
        ], true);
    }

    public function isClosed(): bool
    {
        return !$this->isOpen();
    }

    public function isFulfilled(): bool
    {
        return $this === self::ISSUED;
    }

    /**
     * @return array<int, RequestStatusEnum>
     */
    public function allowedTransitions(): array
    {
        return match ($this) {
            self::PENDING => [self::VERIFIED, self::REJECTED, self::CANCELLED],
            self::VERIFIED => [self::APPROVED, self::AWAITING_PAYMENT, self::REJECTED, self::CANCELLED],
            self::AWAITING_PAYMENT => [self::PROCESSING, self::REJECTED, self::CANCELLED],
            self::APPROVED => [self::PROCESSING, self::READY, self::ISSUED, self::REJECTED, self::CANCELLED],
            self::PROCESSING => [self::READY, self::OUT_FOR_DELIVERY, self::ISSUED, self::REJECTED, self::CANCELLED],
            self::READY => [self::ISSUED, self::OUT_FOR_DELIVERY, self::CANCELLED],
            self::OUT_FOR_DELIVERY => [self::ISSUED, self::CANCELLED],
            self::ISSUED, self::REJECTED, self::CANCELLED => [],
        };
    }

    public function canTransitionTo(self $target): bool
    {
        return in_array($target, $this->allowedTransitions(), true);
    }
}
