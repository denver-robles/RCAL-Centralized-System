<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sacrament_schedules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('parish_id')->constrained('parishes')->cascadeOnDelete();
            $table->foreignId('venue_id')->nullable()->constrained('venues')->nullOnDelete();
            $table->foreignId('presiding_clergy_id')->nullable()->constrained('clergy')->nullOnDelete();
            $table->foreignId('requester_user_id')->nullable()->constrained('users')->nullOnDelete();

            // Strict Canon-compliant sacrament & parish activities (Strictly ZERO Mass Intentions)
            $table->string('sacrament_type', 60)->index();
            $table->string('title', 200);
            $table->text('description')->nullable();

            $table->dateTime('starts_at')->index();
            $table->dateTime('ends_at');
            $table->string('status', 40)->default('scheduled')->index();

            $table->string('requester_name', 160)->nullable();
            $table->string('requester_contact', 255)->nullable();
            $table->unsignedInteger('expected_attendees')->nullable();

            // Direct-to-Register link once completed sacrament is transcribed
            $table->foreignId('record_id')->nullable()->constrained('sacramental_records')->nullOnDelete();
            $table->text('cancellation_reason')->nullable();
            $table->text('notes')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->index(['parish_id', 'starts_at'], 'ix_schedules_parish_start');
            $table->index(['presiding_clergy_id', 'starts_at'], 'ix_schedules_clergy_start');
            $table->index(['venue_id', 'starts_at'], 'ix_schedules_venue_start');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sacrament_schedules');
    }
};
