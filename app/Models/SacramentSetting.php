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
        'time_slots',
    ];

    protected $casts = [
        'is_available' => 'boolean',
        'time_slots' => 'array',
    ];

    public function parish(): BelongsTo
    {
        return $this->belongsTo(Parish::class);
    }
}
