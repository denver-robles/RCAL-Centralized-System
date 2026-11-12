<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

class CertificateTemplate extends Model
{
    protected $fillable = [
        'name',
        'sacrament_type',
        'filename',
        'placeholders',
        'locked_elements',
        'paper_size',
        'parish_id',
    ];

    /**
     * Define attribute casts for automatic serialization.
     * placeholders and locked_elements are JSON arrays in the database.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'placeholders' => 'array',
            'locked_elements' => 'array',
        ];
    }

    /**
     * The parish (tenant) this template belongs to.
     */
    public function parish(): BelongsTo
    {
        return $this->belongsTo(Parish::class);
    }

    /**
     * Full path on disk where the uploaded file lives.
     */
    public function filePath(): string
    {
        return Storage::path('templates/'.$this->filename);
    }
}
