<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Vicariate extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'description',
    ];

    public function parishes(): HasMany
    {
        return $this->hasMany(Parish::class);
    }
}
