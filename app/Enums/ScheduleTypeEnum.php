<?php

namespace App\Enums;

enum ScheduleTypeEnum: string
{
    case BAPTISM = 'baptism';
    case CONFIRMATION = 'confirmation';
    case WEDDING = 'wedding';
    case FUNERAL = 'funeral';
    case BLESSING = 'blessing';
    case EUCHARIST = 'eucharist';
    case ANOINTING = 'anointing';
    case RECONCILIATION = 'reconciliation';
    case MEETING = 'meeting';
    case OFFICE_ACTIVITY = 'office_activity';
    case OTHER = 'other';

    public function label(): string
    {
        return match ($this) {
            self::BAPTISM => 'Baptism',
            self::CONFIRMATION => 'Confirmation',
            self::WEDDING => 'Wedding / Matrimony',
            self::FUNERAL => 'Funeral / Burial',
            self::BLESSING => 'Blessing',
            self::EUCHARIST => 'First Holy Communion',
            self::ANOINTING => 'Anointing of the Sick',
            self::RECONCILIATION => 'Reconciliation / Confession',
            self::MEETING => 'Parish Meeting',
            self::OFFICE_ACTIVITY => 'Office Activity',
            self::OTHER => 'Other Activity',
        };
    }

    public function isSacrament(): bool
    {
        return in_array($this, [
            self::BAPTISM,
            self::CONFIRMATION,
            self::WEDDING,
            self::FUNERAL,
        ], true);
    }

    public function requiresClergy(): bool
    {
        return in_array($this, [
            self::BAPTISM,
            self::CONFIRMATION,
            self::WEDDING,
            self::FUNERAL,
            self::BLESSING,
            self::EUCHARIST,
            self::ANOINTING,
            self::RECONCILIATION,
        ], true);
    }
}
