<?php

namespace App\Models;

use App\Enums\AnnotationTypeEnum;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CanonicalAnnotation extends Model
{
    use HasFactory;

    protected $fillable = [
        'record_id',
        'annotation_type',
        'note_text',
        'event_date',
        'decree_reference',
        'reference_record_id',
        'annotated_by_user_id',
        'annotated_at',
    ];

    protected function casts(): array
    {
        return [
            'annotation_type' => AnnotationTypeEnum::class,
            'event_date' => 'date',
            'annotated_at' => 'datetime',
        ];
    }

    public function record(): BelongsTo
    {
        return $this->belongsTo(SacramentalRecord::class, 'record_id');
    }

    public function referenceRecord(): BelongsTo
    {
        return $this->belongsTo(SacramentalRecord::class, 'reference_record_id');
    }

    public function annotatedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'annotated_by_user_id');
    }
}
