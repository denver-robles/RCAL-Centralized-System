<?php

use App\Models\Parish;
use App\Models\SacramentalRecord;
use App\Models\User;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Ensure St. Sebastian Cathedral exists as a distinct parish
        $cathedral = Parish::where('name', 'St. Sebastian Cathedral')->first();
        if ($cathedral && $cathedral->id === 1) {
            // Update Parish #1 to be St. Joseph the Worker Parish (Inosluban)
            $cathedral->update([
                'name' => 'St. Joseph the Worker Parish',
                'patron_saint' => 'Saint Joseph the Worker',
                'address' => 'Inosluban, Lipa City, Batangas',
                'city_municipality' => 'Lipa City',
                'phone' => '(043)-321-9447 / 0975-897-8022',
                'email' => 'stjosephtheworker.rcal@gmail.com',
                'is_active' => true,
            ]);

            // Re-create St. Sebastian Cathedral as another parish in the directory
            Parish::firstOrCreate(
                ['name' => 'St. Sebastian Cathedral (Chancery)'],
                [
                    'vicariate_id' => $cathedral->vicariate_id,
                    'patron_saint' => 'Saint Sebastian',
                    'address' => 'C.M. Recto Avenue, Lipa City',
                    'city_municipality' => 'Lipa City',
                    'phone' => '7562572',
                    'is_active' => true,
                ]
            );
        } else {
            // If parish 1 is not found or already different, ensure St. Joseph exists
            $stJoseph = Parish::firstOrCreate(
                ['name' => 'St. Joseph the Worker Parish'],
                [
                    'vicariate_id' => 1,
                    'patron_saint' => 'Saint Joseph the Worker',
                    'address' => 'Inosluban, Lipa City, Batangas',
                    'city_municipality' => 'Lipa City',
                    'phone' => '(043)-321-9447 / 0975-897-8022',
                    'email' => 'stjosephtheworker.rcal@gmail.com',
                    'is_active' => true,
                ]
            );

            // Reassign records to St. Joseph the Worker Parish
            SacramentalRecord::query()->whereNotNull('book_data')->update([
                'originating_parish_id' => $stJoseph->id,
            ]);
        }

        // 2. Update parish1 user display name & email
        $user = User::where('username', 'parish1')->first();
        if ($user) {
            $user->update([
                'display_name' => 'St. Joseph the Worker Parish Staff',
                'email' => 'stjosephtheworker.rcal@gmail.com',
            ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No-op
    }
};
