<?php

namespace Database\Factories;

use App\Models\ChartOfAccount;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\ChartOfAccount>
 */
class ChartOfAccountFactory extends Factory
{
    protected $model = ChartOfAccount::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'code' => (string) fake()->unique()->numberBetween(1000, 9999),
            'title' => fake()->words(3, true),
            'type' => fake()->randomElement(['asset', 'liability', 'equity', 'revenue', 'expense']),
            'is_active' => true,
        ];
    }
}
