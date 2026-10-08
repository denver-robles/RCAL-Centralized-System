<?php

namespace App\Enums;

enum AssignmentRoleEnum: string
{
    case PARISH_PRIEST = 'parish_priest';
    case PAROCHIAL_VICAR = 'parochial_vicar';
    case PARISH_ADMINISTRATOR = 'parish_administrator';
    case GUEST_PRIEST = 'guest_priest';
    case ASSISTANT_PRIEST = 'assistant_priest';
    case CHAPLAIN = 'chaplain';
    case DEACON = 'deacon';
    case RETIRED = 'retired';

    public function label(): string
    {
        return match ($this) {
            self::PARISH_PRIEST => 'Parish Priest',
            self::PAROCHIAL_VICAR => 'Parochial Vicar / Assistant Priest',
            self::PARISH_ADMINISTRATOR => 'Parish Administrator',
            self::GUEST_PRIEST => 'Guest Priest / Sacramental Minister',
            self::ASSISTANT_PRIEST => 'Assistant Priest',
            self::CHAPLAIN => 'Chaplain',
            self::DEACON => 'Deacon',
            self::RETIRED => 'Retired',
        };
    }
}
