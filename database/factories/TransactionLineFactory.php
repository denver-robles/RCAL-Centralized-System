<?php

namespace Database\Factories;

use App\Models\ChartOfAccount;
use App\Models\Transaction;
use App\Models\TransactionLine;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\TransactionLine>
 */
class TransactionLineFactory extends Factory
{
    protected $model = TransactionLine::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'transaction_id' => Transaction::factory(),
            'chart_of_account_id' => ChartOfAccount::factory(),
            'debit_amount' => 0.00,
            'credit_amount' => 0.00,
            'notes' => fake()->optional()->sentence(),
        ];
    }

    public function debit(float $amount): static
    {
        return $this->state(fn (array $attributes) => [
            'debit_amount' => $amount,
            'credit_amount' => 0.00,
        ]);
    }

    public function credit(float $amount): static
    {
        return $this->state(fn (array $attributes) => [
            'debit_amount' => 0.00,
            'credit_amount' => $amount,
        ]);
    }
}
