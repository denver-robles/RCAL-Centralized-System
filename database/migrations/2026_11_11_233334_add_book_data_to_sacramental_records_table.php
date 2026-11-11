<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('sacramental_records', function (Blueprint $table) {
            $table->json('book_data')->nullable()->after('register_notes');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('sacramental_records', function (Blueprint $table) {
            $table->dropColumn('book_data');
        });
    }
};
