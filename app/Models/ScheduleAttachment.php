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

    public function schedule(): BelongsTo
    {
        return $this->belongsTo(SacramentSchedule::class, 'sacrament_schedule_id');
    }
}
