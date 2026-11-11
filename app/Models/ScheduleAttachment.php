<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ScheduleAttachment extends Model
{
    protected $fillable = [
        'sacrament_schedule_id',
        'document_type',
        'file_path',
    ];

    protected $appends = [
        'view_url',
        'download_url',
    ];

    public function schedule(): BelongsTo
    {
        return $this->belongsTo(SacramentSchedule::class, 'sacrament_schedule_id');
    }

    public function getViewUrlAttribute(): string
    {
        return route('schedule-attachments.view', $this->id);
    }

    public function getDownloadUrlAttribute(): string
    {
        return route('schedule-attachments.download', $this->id);
    }
}
