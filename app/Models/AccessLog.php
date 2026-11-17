<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AccessLog extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $fillable = [
        'user_id',
        'record_id',
        'action',
        'created_at',
    ];

    protected $appends = [
        'accessed_at',
        'resource_type',
        'resource_id',
        'resource_identifier',
    ];

    protected function casts(): array
    {
        return [
            'created_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function record(): BelongsTo
    {
        return $this->belongsTo(SacramentalRecord::class, 'record_id');
    }

    public function getAccessedAtAttribute(): ?string
    {
        return $this->created_at?->toIso8601String();
    }

    public function getResourceTypeAttribute(): string
    {
        return 'sacramental_record';
    }

    public function getResourceIdAttribute(): ?int
    {
        return $this->record_id;
    }

    public function getResourceIdentifierAttribute(): string
    {
        return $this->record?->citation ?? "Record #{$this->record_id}";
    }
}
