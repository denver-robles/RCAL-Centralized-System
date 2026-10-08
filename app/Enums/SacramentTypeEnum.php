<?php

namespace App\Enums;

enum SacramentTypeEnum: string
{
    case BAPTISM = 'baptism';
    case CONFIRMATION = 'confirmation';
    case MARRIAGE = 'marriage';
    case DEATH = 'death';

    public function label(): string
    {
        return match ($this) {
            self::BAPTISM => 'Baptism',
            self::CONFIRMATION => 'Confirmation',
            self::MARRIAGE => 'Marriage',
            self::DEATH => 'Death / Burial',
        };
    }
}
