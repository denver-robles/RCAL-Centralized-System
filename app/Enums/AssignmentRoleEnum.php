<?php

namespace App\Enums;

enum AssignmentRoleEnum: string
{
    case PARISH_PRIEST = 'parish_priest';
    case ASSISTANT_PRIEST = 'assistant_priest';
    case PARISH_ADMINISTRATOR = 'parish_administrator';
    case CHAPLAIN = 'chaplain';
    case DEACON = 'deacon';
    case RETIRED = 'retired';

    public function label(): string
    {
        return match ($this) {
            self::PARISH_PRIEST => 'Parish Priest',
            self::ASSISTANT_PRIEST => 'Assistant Priest',
            self::PARISH_ADMINISTRATOR => 'Parish Administrator',
            self::CHAPLAIN => 'Chaplain',
            self::DEACON => 'Deacon',
            self::RETIRED => 'Retired',
        };
    }
}
