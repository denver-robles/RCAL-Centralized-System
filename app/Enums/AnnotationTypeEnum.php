<?php

namespace App\Enums;

enum AnnotationTypeEnum: string
{
    case MARRIAGE = 'marriage';
    case CONFIRMATION = 'confirmation';
    case ORDINATION = 'ordination';
    case RELIGIOUS_PROFESSION = 'religious_profession';
    case FULL_COMMUNION = 'full_communion';
    case DEATH = 'death';
    case HOLY_ORDERS = 'holy_orders';
    case SOLEMN_VOWS = 'solemn_vows';
    case NULLITY = 'nullity';
    case CLERICAL_CORRECTION = 'clerical_correction';
    case NAME_CORRECTION = 'name_correction';
    case OTHER = 'other';

    public function label(): string
    {
        return match ($this) {
            self::MARRIAGE => 'Marriage',
            self::CONFIRMATION => 'Confirmation',
            self::ORDINATION => 'Ordination',
            self::RELIGIOUS_PROFESSION => 'Religious Profession',
            self::FULL_COMMUNION => 'Received into Full Communion',
            self::DEATH => 'Death',
            self::HOLY_ORDERS => 'Holy Orders',
            self::SOLEMN_VOWS => 'Solemn Religious Vows',
            self::NULLITY => 'Declaration of Nullity',
            self::CLERICAL_CORRECTION => 'Clerical Correction',
            self::NAME_CORRECTION => 'Name Correction',
            self::OTHER => 'Other Canonical Note',
        };
    }

    public function linksToRecord(): bool
    {
        return in_array($this, [
            self::MARRIAGE,
            self::CONFIRMATION,
            self::ORDINATION,
            self::HOLY_ORDERS,
            self::DEATH,
        ], true);
    }
}
