<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Parish extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name',
        'patron_saint',
        'feast_day',
        'vicariate_id',
        'address',
        'municipality',
        'city_municipality',
        'contact_number',
        'phone',
        'email',
        'established_year',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'established_year' => 'integer',
        ];
    }

    public function vicariate(): BelongsTo
    {
        return $this->belongsTo(Vicariate::class);
    }

    public function clergyAssignments(): HasMany
    {
        return $this->hasMany(ClergyAssignment::class);
    }

    public function sacramentalRecords(): HasMany
    {
        return $this->hasMany(SacramentalRecord::class, 'originating_parish_id');
    }

    public function venues(): HasMany
    {
        return $this->hasMany(Venue::class);
    }

    public function schedules(): HasMany
    {
        return $this->hasMany(SacramentSchedule::class);
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class, 'home_parish_id');
    }
}
