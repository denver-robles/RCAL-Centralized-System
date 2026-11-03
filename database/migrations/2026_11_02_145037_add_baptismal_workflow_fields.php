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
            $table->string('certificate_submission_mode', 50)->nullable()->after('payment_status'); // 'online' or 'follow_up_office'
            $table->foreignId('requested_clergy_id')->nullable()->after('presiding_clergy_id')->constrained('clergy')->nullOnDelete();
            $table->text('staff_notes')->nullable()->after('notes');
            $table->json('document_checklist')->nullable()->after('staff_notes');
        });

        Schema::table('sacrament_settings', function (Blueprint $table) {
            $table->json('allowed_days')->nullable()->after('is_available'); // e.g. ["saturday", "sunday"]
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('sacrament_settings', function (Blueprint $table) {
            $table->dropColumn('allowed_days');
        });

        Schema::table('sacrament_schedules', function (Blueprint $table) {
            $table->dropForeign(['requested_clergy_id']);
            $table->dropColumn([
                'certificate_submission_mode',
                'requested_clergy_id',
                'staff_notes',
                'document_checklist',
            ]);
        });
    }
};
