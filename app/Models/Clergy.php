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

    protected $appends = [
        'full_name',
        'titled_name',
        'category',
    ];

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
        $base = collect([$this->first_name, $this->middle_name, $this->last_name])
            ->filter()
            ->join(' ');

        if (! empty($this->suffix)) {
            $s = trim($this->suffix);
            if (str_starts_with($s, ',')) {
                return "{$base}{$s}";
            }
            if (in_array(strtoupper($s), ['D.D.', 'OSJ', 'JR.', 'SR.', 'II', 'III', 'IV', 'V', 'VI', 'SDB', 'OFM', 'OP', 'SJ', 'OAR', 'CP', 'CS', 'OSA'], true)) {
                return "{$base}, {$s}";
            }

            return "{$base} {$s}";
        }

        return $base;
    }

    public function getTitledNameAttribute(): string
    {
        $titleLabel = $this->title instanceof ClergyTitleEnum ? $this->title->label() : ($this->title ?: 'Rev. Fr.');

        return "{$titleLabel} {$this->full_name}";
    }

    public function getCategoryAttribute(): string
    {
        $t = $this->title instanceof ClergyTitleEnum ? $this->title->value : (string) $this->title;

        if (in_array($t, ['archbishop', 'bishop'], true)) {
            return 'Bishops (Most Reverend)';
        }
        if ($t === 'monsignor') {
            return 'Monsignors (Reverend Monsignor)';
        }
        if (! empty($this->suffix) && in_array(strtoupper(trim($this->suffix, ',. ')), ['OSJ', 'OFM', 'SDB', 'OP', 'SJ', 'OAR', 'CP', 'CS', 'OSA'], true)) {
            return 'Religious Order Priests';
        }
        if ($t === 'deacon') {
            return 'Deacons';
        }

        return 'Priests (Reverend Father)';
    }

    /**
     * Create or retrieve a Clergy record from a manually entered guest priest name.
     */
    public static function firstOrCreateFromGuestName(string $rawName, ?int $parishId = null): self
    {
        $name = trim($rawName);
        $title = ClergyTitleEnum::FATHER;

        // Detect title prefix
        if (preg_match('/^(Most\s+Rev\.|Bishop|Archbishop)\s+/i', $name, $m)) {
            $title = ClergyTitleEnum::BISHOP;
            $name = trim(substr($name, strlen($m[0])));
        } elseif (preg_match('/^(Rev\.\s*Msgr\.|Msgr\.|Monsignor)\s+/i', $name, $m)) {
            $title = ClergyTitleEnum::MONSIGNOR;
            $name = trim(substr($name, strlen($m[0])));
        } elseif (preg_match('/^(Rev\.\s*Fr\.|Fr\.|Father)\s+/i', $name, $m)) {
            $title = ClergyTitleEnum::FATHER;
            $name = trim(substr($name, strlen($m[0])));
        } elseif (preg_match('/^(Rev\.\s*Mr\.|Rev\.|Deacon)\s+/i', $name, $m)) {
            $title = ClergyTitleEnum::DEACON;
            $name = trim(substr($name, strlen($m[0])));
        }

        // Detect suffix
        $suffix = null;
        if (preg_match('/[,\s]+(Jr\.?|Sr\.?|II|III|IV|V|VI|OSJ|SDB|OFM|OP|SJ|OAR|CP|CS|OSA|D\.D\.?)$/i', $name, $m)) {
            $suffix = trim($m[1], ', ');
            $name = trim(substr($name, 0, -strlen($m[0])));
        }

        // Split remaining into first and last name
        $parts = preg_split('/\s+/', $name);
        if (count($parts) === 1) {
            $firstName = $parts[0];
            $lastName = $parts[0];
        } else {
            $lastName = array_pop($parts);
            $firstName = implode(' ', $parts);
        }

        return self::firstOrCreate(
            [
                'first_name' => $firstName,
                'last_name' => $lastName,
            ],
            [
                'title' => $title,
                'suffix' => $suffix,
                'status' => 'Active Ministry',
                'is_active' => true,
            ]
        );
    }
}
