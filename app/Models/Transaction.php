<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Transaction extends Model
{
    use HasFactory;

    protected $guarded = [];

    protected $casts = [
        'transaction_date' => 'date',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'transaction_date' => 'date',
        ];
    }

    /**
     * Ledger Invariant: Transactions are immutable permanent records once inscribed.
     */
    protected static function booted(): void
    {
        static::updating(function (Transaction $transaction) {
            throw new \DomainException("Parish Ledger Invariant: Transaction #{$transaction->id} ({$transaction->reference_no}) is immutable once recorded.");
        });

        static::deleting(function (Transaction $transaction) {
            throw new \DomainException("Parish Ledger Invariant: Transaction #{$transaction->id} ({$transaction->reference_no}) cannot be deleted once recorded.");
        });
    }

    public function lines(): HasMany
    {
        return $this->hasMany(TransactionLine::class);
    }

    public function preparer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'prepared_by');
    }

    public function parish(): BelongsTo
    {
        return $this->belongsTo(Parish::class);
    }

    public function totalDebit(): float
    {
        return (float) $this->lines->sum('debit_amount');
    }

    public function totalCredit(): float
    {
        return (float) $this->lines->sum('credit_amount');
    }

    public function isBalanced(): bool
    {
        return bccomp((string) $this->totalDebit(), (string) $this->totalCredit(), 2) === 0;
    }
}
