<?php

namespace Database\Seeders;

use App\Enums\RoleEnum;
use App\Models\Parish;
use App\Models\User;
use App\Models\Vicariate;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database with the original system accounts and parishes.
     */
    public function run(): void
    {
        // 1. Vicariates
        $vicariate1 = Vicariate::firstOrCreate(
            ['name' => 'Vicariate I - St. Francis Xavier'],
            ['description' => 'Metropolitan Cathedral Jurisdiction']
        );

        $vicariate2 = Vicariate::firstOrCreate(
            ['name' => 'Vicariate II - St. John the Evangelist'],
            ['description' => 'Eastern Archdiocesan Parishes']
        );

        // 2. Original Parishes
        $cathedral = Parish::firstOrCreate(
            ['name' => 'St. Sebastian Cathedral'],
            [
                'vicariate_id' => $vicariate1->id,
                'patron_saint' => 'Saint Sebastian',
                'address' => 'C.M. Recto Avenue, Lipa City',
                'city_municipality' => 'Lipa City',
                'phone' => '7562572',
                'is_active' => true,
            ]
        );

        $assumption = Parish::firstOrCreate(
            ['name' => 'Our Lady of the Assumption Parish'],
            [
                'vicariate_id' => $vicariate1->id,
                'address' => 'Lipa City',
                'city_municipality' => 'Lipa City',
                'phone' => '7562111',
                'is_active' => true,
            ]
        );

        $sanCarlos = Parish::firstOrCreate(
            ['name' => 'San Carlos Borromeo Parish'],
            [
                'vicariate_id' => $vicariate2->id,
                'address' => 'Tanauan City',
                'city_municipality' => 'Tanauan City',
                'phone' => '7781234',
                'is_active' => true,
            ]
        );

        // 3. Original System Accounts
        // Admin (Chancery Administrator) - password: adminpw
        User::firstOrCreate(
            ['username' => 'admin'],
            [
                'email' => 'chancery@rcal.local',
                'display_name' => 'Chancery Administrator',
                'role' => RoleEnum::ADMIN,
                'password' => Hash::make('adminpw'),
                'home_parish_id' => null,
                'phone' => '7562572',
                'is_active' => true,
            ]
        );

        // Parish 1 Staff - password: parishpw
        User::firstOrCreate(
            ['username' => 'parish1'],
            [
                'email' => 'parish1@example.ph',
                'display_name' => 'St. Sebastian Cathedral Secretary',
                'role' => RoleEnum::PARISH_STAFF,
                'password' => Hash::make('parishpw'),
                'home_parish_id' => $cathedral->id,
                'phone' => '7562572',
                'is_active' => true,
            ]
        );

        // Parish 2 Staff - password: parishpw
        User::firstOrCreate(
            ['username' => 'parish2'],
            [
                'email' => 'parish2@example.ph',
                'display_name' => 'Our Lady of the Assumption Parish Secretary',
                'role' => RoleEnum::PARISH_STAFF,
                'password' => Hash::make('parishpw'),
                'home_parish_id' => $assumption->id,
                'phone' => '7562111',
                'is_active' => true,
            ]
        );

        // Parish 3 Staff - password: parishpw
        User::firstOrCreate(
            ['username' => 'parish3'],
            [
                'email' => 'parish3@example.ph',
                'display_name' => 'San Carlos Borromeo Parish Secretary',
                'role' => RoleEnum::PARISH_STAFF,
                'password' => Hash::make('parishpw'),
                'home_parish_id' => $sanCarlos->id,
                'phone' => '7781234',
                'is_active' => true,
            ]
        );

        // Parishioner - password: parishpw
        User::firstOrCreate(
            ['username' => 'juan@example.ph'],
            [
                'email' => 'juan@example.ph',
                'display_name' => 'Juan Dela Cruz',
                'role' => RoleEnum::PARISHIONER,
                'password' => Hash::make('parishpw'),
                'home_parish_id' => $cathedral->id,
                'phone' => '7562572',
                'is_active' => true,
            ]
        );
    }
}
