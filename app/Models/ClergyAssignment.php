<?php

namespace App\Models;

use App\Enums\AssignmentRoleEnum;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ClergyAssignment extends Model
{
    use HasFactory;

    protected $fillable = [
        'clergy_id',
        'parish_id',
        'role',
        'assigned_from',
        'assigned_to',
    ];

    protected function casts(): array
    {
        return [
            'role' => AssignmentRoleEnum::class,
            'assigned_from' => 'date',
            'assigned_to' => 'date',
        ];
    }

    public function clergy(): BelongsTo
    {
        return $this->belongsTo(Clergy::class);
    }

    public function parish(): BelongsTo
    {
        return $this->belongsTo(Parish::class);
    }

    public function getIsCurrentAttribute(): bool
    {
        return $this->assigned_to === null;
    }
}
