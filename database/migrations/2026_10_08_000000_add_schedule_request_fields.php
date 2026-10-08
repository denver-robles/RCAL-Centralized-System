<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Add fields to existing sacrament_schedules
        Schema::table('sacrament_schedules', function (Blueprint $table) {
            $table->string('requester_email', 160)->nullable()->after('requester_contact');
            $table->string('requester_relationship', 100)->nullable()->after('requester_email');
            $table->text('requester_address')->nullable()->after('requester_relationship');
            
            $table->dateTime('alternative_starts_at')->nullable()->after('ends_at');
            $table->json('specific_data')->nullable()->after('alternative_starts_at'); // stores Phase 3 data
            
            $table->string('payment_method', 50)->nullable()->after('specific_data');
            $table->string('payment_receipt_path')->nullable()->after('payment_method');
            $table->string('payment_status', 40)->default('unpaid')->after('payment_receipt_path');
        });

        // 2. Create schedule attachments table
        Schema::create('schedule_attachments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sacrament_schedule_id')->constrained()->cascadeOnDelete();
            $table->string('document_type', 100);
            $table->string('file_path');
            $table->timestamps();
        });

        // 3. Create sacrament settings table
        Schema::create('sacrament_settings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('parish_id')->constrained('parishes')->cascadeOnDelete();
            $table->string('sacrament_type', 60);
            $table->boolean('is_available')->default(true);
            $table->json('time_slots')->nullable(); // e.g. ["08:00-09:00", "09:00-10:00"]
            $table->timestamps();
            
            $table->unique(['parish_id', 'sacrament_type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sacrament_settings');
        Schema::dropIfExists('schedule_attachments');
        Schema::table('sacrament_schedules', function (Blueprint $table) {
            $table->dropColumn([
                'requester_email',
                'requester_relationship',
                'requester_address',
                'alternative_starts_at',
                'specific_data',
                'payment_method',
                'payment_receipt_path',
                'payment_status'
            ]);
        });
    }
};
