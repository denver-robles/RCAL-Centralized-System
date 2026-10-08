<?php

namespace App\Models;

use App\Enums\ClergyTitleEnum;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Clergy extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'clergy';

    protected $fillable = [
        'first_name',
        'middle_name',
        'last_name',
        'suffix',
        'title',
        'sex',
        'date_of_birth',
        'ordination_date',
        'date_of_death',
        'status',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'title' => ClergyTitleEnum::class,
            'date_of_birth' => 'date',
            'ordination_date' => 'date',
            'date_of_death' => 'date',
            'is_active' => 'boolean',
        ];
    }

    public function assignments(): HasMany
    {
        return $this->hasMany(ClergyAssignment::class);
    }

    public function performedRecords(): HasMany
    {
        return $this->hasMany(SacramentalRecord::class, 'performed_by_clergy_id');
    }

    public function presidedSchedules(): HasMany
    {
        return $this->hasMany(SacramentSchedule::class, 'presiding_clergy_id');
    }

    public function userAccounts(): HasMany
    {
        return $this->hasMany(User::class, 'clergy_id');
    }

    public function getFullNameAttribute(): string
    {
        return collect([$this->first_name, $this->middle_name, $this->last_name, $this->suffix])
            ->filter()
            ->join(' ');
    }

    public function getTitledNameAttribute(): string
    {
        $titleLabel = $this->title instanceof ClergyTitleEnum ? $this->title->label() : ($this->title ?: 'Rev. Fr.');
        return "{$titleLabel} {$this->full_name}";
    }
}
