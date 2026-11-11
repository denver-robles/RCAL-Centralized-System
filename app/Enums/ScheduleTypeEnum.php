<?php

namespace App\Enums;

enum ScheduleTypeEnum: string
{
    case BAPTISM = 'baptism';
    case CONFIRMATION = 'confirmation';
    case WEDDING = 'wedding';
    case MATRIMONY = 'matrimony';
    case FUNERAL = 'funeral';
    case BLESSING = 'blessing';
    case SPONSORED_MASS = 'sponsored_mass';
    case BONE_TRANSFER = 'bone_transfer';
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
            self::WEDDING, self::MATRIMONY => 'Wedding / Matrimony',
            self::FUNERAL => 'Mass / Blessing for Departed',
            self::BLESSING => 'Blessing',
            self::SPONSORED_MASS => 'Sponsored Mass',
            self::BONE_TRANSFER => 'Bone / Ash Transfer',
            self::EUCHARIST => 'First Holy Communion',
            self::ANOINTING => 'Mass / Blessing for Departed',
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
            self::MATRIMONY,
            self::FUNERAL,
            self::SPONSORED_MASS,
            self::BONE_TRANSFER,
        ], true);
    }

    public function requiresClergy(): bool
    {
        return in_array($this, [
            self::BAPTISM,
            self::CONFIRMATION,
            self::WEDDING,
            self::MATRIMONY,
            self::FUNERAL,
            self::BLESSING,
            self::SPONSORED_MASS,
            self::BONE_TRANSFER,
            self::EUCHARIST,
            self::ANOINTING,
            self::RECONCILIATION,
        ], true);
    }
}
