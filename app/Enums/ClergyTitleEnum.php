<?php

namespace App\Enums;

enum ClergyTitleEnum: string
{
    case ARCHBISHOP = 'archbishop';
    case BISHOP = 'bishop';
    case MONSIGNOR = 'monsignor';
    case FATHER = 'father';
    case DEACON = 'deacon';

    public function label(): string
    {
        return match ($this) {
            self::ARCHBISHOP, self::BISHOP => 'Most Rev.',
            self::MONSIGNOR => 'Msgr.',
            self::FATHER => 'Rev. Fr.',
            self::DEACON => 'Rev. Mr.',
        };
    }
}
