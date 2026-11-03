<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SacramentSetting extends Model
{
    protected $fillable = [
        'parish_id',
        'sacrament_type',
        'is_available',
        'allowed_days',
        'time_slots',
    ];

    protected function casts(): array
    {
        return [
            'is_available' => 'boolean',
            'allowed_days' => 'array',
            'time_slots' => 'array',
        ];
    }

    public function parish(): BelongsTo
    {
        return $this->belongsTo(Parish::class);
    }
}
