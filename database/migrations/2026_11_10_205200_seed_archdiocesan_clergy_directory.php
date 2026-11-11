<?php

use App\Enums\ClergyTitleEnum;
use App\Models\Clergy;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    /**
     * Seed the Archdiocesan Clergy Directory with official bishops, monsignors, religious, and diocesan priests.
     */
    public function up(): void
    {
        $directory = [
            // Bishops (Most Reverend)
            [
                'title' => ClergyTitleEnum::ARCHBISHOP,
                'first_name' => 'Ramon',
                'middle_name' => 'Cabrera',
                'last_name' => 'Argüelles',
                'suffix' => 'D.D.',
                'status' => 'Archbishop Emeritus of Lipa',
            ],
            [
                'title' => ClergyTitleEnum::ARCHBISHOP,
                'first_name' => 'Gilbert',
                'middle_name' => 'Armea',
                'last_name' => 'Garcera',
                'suffix' => 'D.D.',
                'status' => 'Archbishop of Lipa',
            ],

            // Monsignors (Reverend Monsignor)
            ['title' => ClergyTitleEnum::MONSIGNOR, 'first_name' => 'Cecilio', 'last_name' => 'Arce'],
            ['title' => ClergyTitleEnum::MONSIGNOR, 'first_name' => 'Conrado', 'last_name' => 'Castillo'],
            ['title' => ClergyTitleEnum::MONSIGNOR, 'first_name' => 'Ruben', 'last_name' => 'Dimaculangan'],
            ['title' => ClergyTitleEnum::MONSIGNOR, 'first_name' => 'Ernesto', 'last_name' => 'Mandanas', 'suffix' => 'Jr.'],
            ['title' => ClergyTitleEnum::MONSIGNOR, 'first_name' => 'Antonio', 'last_name' => 'Mendoza'],
            ['title' => ClergyTitleEnum::MONSIGNOR, 'first_name' => 'Rafael', 'last_name' => 'Oriondo'],
            ['title' => ClergyTitleEnum::MONSIGNOR, 'first_name' => 'Edgardo', 'last_name' => 'Pagcaliuangan'],

            // Religious Order Priests (OSJ)
            ['title' => ClergyTitleEnum::FATHER, 'first_name' => 'Arnold', 'last_name' => 'Rosal', 'suffix' => 'OSJ'],
            ['title' => ClergyTitleEnum::FATHER, 'first_name' => 'Edwin', 'last_name' => 'Tolentino', 'suffix' => 'OSJ'],

            // Priests (Reverend Father)
            ['title' => ClergyTitleEnum::FATHER, 'first_name' => 'Ricardo', 'last_name' => 'Adan'],
            ['title' => ClergyTitleEnum::FATHER, 'first_name' => 'Bernard', 'last_name' => 'Aguila'],
            ['title' => ClergyTitleEnum::FATHER, 'first_name' => 'Jayson', 'last_name' => 'Alcaraz'],
            ['title' => ClergyTitleEnum::FATHER, 'first_name' => 'Oscar', 'last_name' => 'Andal'],
            ['title' => ClergyTitleEnum::FATHER, 'first_name' => 'Jesse Lucas', 'last_name' => 'Balilia'],
            ['title' => ClergyTitleEnum::FATHER, 'first_name' => 'Timoteo Gameline', 'last_name' => 'Balita'],
            ['title' => ClergyTitleEnum::FATHER, 'first_name' => 'Dale Anthony', 'middle_name' => 'Q.', 'last_name' => 'Baretto Ko'],
            ['title' => ClergyTitleEnum::FATHER, 'first_name' => 'Rogelio Maynardo', 'middle_name' => 'T.', 'last_name' => 'Beredo', 'suffix' => 'Jr.'],
            ['title' => ClergyTitleEnum::FATHER, 'first_name' => 'Aloysius', 'last_name' => 'Buensalida'],
            ['title' => ClergyTitleEnum::FATHER, 'first_name' => 'Glenn', 'last_name' => 'Cantos'],
            ['title' => ClergyTitleEnum::FATHER, 'first_name' => 'Darwin', 'last_name' => 'de Leon'],
            ['title' => ClergyTitleEnum::FATHER, 'first_name' => 'Donaldo', 'middle_name' => 'V.', 'last_name' => 'Dimaandal'],
            ['title' => ClergyTitleEnum::FATHER, 'first_name' => 'Anthony Carlo', 'last_name' => 'Esteron'],
            ['title' => ClergyTitleEnum::FATHER, 'first_name' => 'Joselin', 'last_name' => 'Gonda'],
            ['title' => ClergyTitleEnum::FATHER, 'first_name' => 'Ariel', 'last_name' => 'Gonzales'],
            ['title' => ClergyTitleEnum::FATHER, 'first_name' => 'Manuel', 'last_name' => 'Guazon'],
            ['title' => ClergyTitleEnum::FATHER, 'first_name' => 'Eugene Dominic', 'last_name' => 'Hechanova'],
            ['title' => ClergyTitleEnum::FATHER, 'first_name' => 'Richard', 'last_name' => 'Hernandez'],
            ['title' => ClergyTitleEnum::FATHER, 'first_name' => 'Carlo Magno', 'last_name' => 'Ilagan'],
            ['title' => ClergyTitleEnum::FATHER, 'first_name' => 'Federico', 'last_name' => 'Magboo'],
            ['title' => ClergyTitleEnum::FATHER, 'first_name' => 'Milo', 'last_name' => 'Malabuyoc'],
            ['title' => ClergyTitleEnum::FATHER, 'first_name' => 'Joseph', 'last_name' => 'Mendoza'],
            ['title' => ClergyTitleEnum::FATHER, 'first_name' => 'Onofre Bimbo', 'last_name' => 'Pantoja'],
            ['title' => ClergyTitleEnum::FATHER, 'first_name' => 'Angel', 'last_name' => 'Pastor'],
            ['title' => ClergyTitleEnum::FATHER, 'first_name' => 'Rochester Charles', 'last_name' => 'Resuello'],
            ['title' => ClergyTitleEnum::FATHER, 'first_name' => 'Wilfredo', 'last_name' => 'Rosales'],
            ['title' => ClergyTitleEnum::FATHER, 'first_name' => 'Noel', 'last_name' => 'Salanguit'],
            ['title' => ClergyTitleEnum::FATHER, 'first_name' => 'Miguel', 'last_name' => 'Samaniego'],
            ['title' => ClergyTitleEnum::FATHER, 'first_name' => 'Jayson', 'last_name' => 'Siapco'],
            ['title' => ClergyTitleEnum::FATHER, 'first_name' => 'Sabas', 'last_name' => 'Titular'],
            ['title' => ClergyTitleEnum::FATHER, 'first_name' => 'Froilan', 'middle_name' => 'C.', 'last_name' => 'Carreon', 'suffix' => 'Jr.'],
            ['title' => ClergyTitleEnum::DEACON, 'first_name' => 'Marco Paulo', 'last_name' => 'Lajara'],
            ['title' => ClergyTitleEnum::FATHER, 'first_name' => 'Nathaniel', 'last_name' => 'Pamplona'],
            ['title' => ClergyTitleEnum::FATHER, 'first_name' => 'Emmanuel', 'last_name' => 'Lucero'],
            ['title' => ClergyTitleEnum::FATHER, 'first_name' => 'Jaime Jose', 'last_name' => 'Culla', 'suffix' => 'Jr.'],
            ['title' => ClergyTitleEnum::FATHER, 'first_name' => 'Raeson', 'last_name' => 'Limbo'],
            ['title' => ClergyTitleEnum::FATHER, 'first_name' => 'Mikhail', 'middle_name' => 'Ilagan', 'last_name' => 'Sandoval'],
            ['title' => ClergyTitleEnum::FATHER, 'first_name' => 'Juan Carlos', 'last_name' => 'Coloso'],
        ];

        foreach ($directory as $data) {
            Clergy::firstOrCreate(
                [
                    'first_name' => $data['first_name'],
                    'last_name' => $data['last_name'],
                ],
                [
                    'title' => $data['title'],
                    'middle_name' => $data['middle_name'] ?? null,
                    'suffix' => $data['suffix'] ?? null,
                    'sex' => 'male',
                    'status' => $data['status'] ?? 'Active Ministry',
                    'is_active' => true,
                ]
            );
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No destructive drop of directory members
    }
};
