<?php

namespace App\Enums;

enum LegitimacyStatusEnum: string
{
    case LEGITIMATE = 'legitimate';
    case ILLEGITIMATE = 'illegitimate';

    public function label(): string
    {
        return match ($this) {
            self::LEGITIMATE => 'Legitimate',
            self::ILLEGITIMATE => 'Illegitimate',
        };
    }
}
