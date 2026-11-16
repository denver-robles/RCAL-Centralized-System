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
        Schema::table('transactions', function (Blueprint $table) {
            if (Schema::hasColumn('transactions', 'checked_by')) {
                $table->dropConstrainedForeignId('checked_by');
            }
            if (Schema::hasColumn('transactions', 'approved_by')) {
                $table->dropConstrainedForeignId('approved_by');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->foreignId('checked_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
        });
    }
};
