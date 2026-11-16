<?php

namespace Database\Factories;

use App\Models\Parish;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Transaction>
 */
class TransactionFactory extends Factory
{
    protected $model = Transaction::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'parish_id' => Parish::factory(),
            'reference_no' => 'OR-'.fake()->unique()->numerify('2026-######'),
            'transaction_date' => fake()->date(),
            'type' => 'receipt',
            'contact_name' => fake()->name(),
            'description' => fake()->sentence(),
            'status' => 'posted',
            'prepared_by' => User::factory(),
        ];
    }
}
