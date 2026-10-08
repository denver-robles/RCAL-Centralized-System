<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Person extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'persons';

    protected $fillable = [
        'first_name',
        'middle_name',
        'last_name',
        'suffix',
        'sex',
        'date_of_birth',
        'place_of_birth',
        'date_of_death',
        'father_name',
        'mother_name',
        'father_id',
        'mother_id',
    ];

    protected function casts(): array
    {
        return [
            'date_of_birth' => 'date:Y-m-d',
            'date_of_death' => 'date:Y-m-d',
        ];
    }

    public function father(): BelongsTo
    {
        return $this->belongsTo(Person::class, 'father_id');
    }

    public function mother(): BelongsTo
    {
        return $this->belongsTo(Person::class, 'mother_id');
    }

    public function recordsAsSubject(): HasMany
    {
        return $this->hasMany(SacramentalRecord::class, 'person_id');
    }

    public function recordsAsSpouse(): HasMany
    {
        return $this->hasMany(SacramentalRecord::class, 'spouse_person_id');
    }

    public function getFullNameAttribute(): string
    {
        return collect([$this->first_name, $this->middle_name, $this->last_name, $this->suffix])
            ->filter()
            ->join(' ');
    }

    public function getSortNameAttribute(): string
    {
        $given = collect([$this->first_name, $this->middle_name, $this->suffix])->filter()->join(' ');
        return $given ? "{$this->last_name}, {$given}" : $this->last_name;
    }

    public function getParentNamesAttribute(): string
    {
        return collect([$this->father_name, $this->mother_name])->filter()->join(' and ');
    }

    public function getIsDeceasedAttribute(): bool
    {
        return $this->date_of_death !== null;
    }
}
