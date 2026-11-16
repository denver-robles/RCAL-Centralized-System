<?php

namespace Database\Factories;

use App\Models\Parish;
use App\Models\Vicariate;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Parish>
 */
class ParishFactory extends Factory
{
    protected $model = Parish::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->company().' Parish',
            'patron_saint' => 'St. '.fake()->firstName(),
            'feast_day' => 'March 19',
            'vicariate_id' => fn () => Vicariate::firstOrCreate(['name' => 'Archdiocesan Central Vicariate'])->id,
            'city_municipality' => fake()->city(),
            'is_active' => true,
        ];
    }
}
