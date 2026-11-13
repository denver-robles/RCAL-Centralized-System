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
        Schema::table('sacrament_schedules', function (Blueprint $table) {
            $table->decimal('payment_amount', 10, 2)->nullable()->after('payment_status');
            $table->string('payment_reference', 100)->nullable()->after('payment_amount');
            $table->date('paid_at')->nullable()->after('payment_reference');
            $table->foreignId('payment_recorded_by')->nullable()->after('paid_at')->constrained('users')->nullOnDelete();
            $table->text('payment_notes')->nullable()->after('payment_recorded_by');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('sacrament_schedules', function (Blueprint $table) {
            $table->dropForeign(['payment_recorded_by']);
            $table->dropColumn([
                'payment_amount',
                'payment_reference',
                'paid_at',
                'payment_recorded_by',
                'payment_notes',
            ]);
        });
    }
};