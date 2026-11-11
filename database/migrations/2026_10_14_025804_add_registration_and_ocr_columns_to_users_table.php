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
        Schema::table('users', function (Blueprint $table) {
            $table->string('first_name', 60)->nullable()->after('display_name');
            $table->string('middle_name', 60)->nullable()->after('first_name');
            $table->string('last_name', 60)->nullable()->after('middle_name');
            $table->string('name_suffix', 20)->nullable()->after('last_name');
            $table->date('date_of_birth')->nullable()->after('name_suffix');
            $table->string('extracted_id_type', 80)->nullable()->after('identity_status');
            $table->string('id_number_masked', 50)->nullable()->after('extracted_id_type');
            $table->json('extracted_id_details')->nullable()->after('id_number_masked');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'first_name',
                'middle_name',
                'last_name',
                'name_suffix',
                'date_of_birth',
                'extracted_id_type',
                'id_number_masked',
                'extracted_id_details',
            ]);
        });
    }
};
