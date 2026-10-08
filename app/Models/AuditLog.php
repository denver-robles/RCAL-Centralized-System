<?php

namespace App\Models;

use App\Enums\AuditActionEnum;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AuditLog extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $fillable = [
        'user_id',
        'actor_username',
        'action',
        'subject_type',
        'subject_id',
        'subject_label',
        'old_values',
        'new_values',
        'ip_address',
        'user_agent',
        'request_path',
        'request_method',
        'note',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'action' => AuditActionEnum::class,
            'old_values' => 'array',
            'new_values' => 'array',
            'created_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function getIsMutationAttribute(): bool
    {
        return $this->action instanceof AuditActionEnum ? $this->action->isMutation() : false;
    }
}
