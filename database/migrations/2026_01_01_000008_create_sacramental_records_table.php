<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sacramental_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('person_id')->constrained('persons')->cascadeOnDelete();
            $table->foreignId('spouse_person_id')->nullable()->constrained('persons')->nullOnDelete();
            $table->string('sacrament_type', 40)->index();
            $table->date('event_date')->index();
            $table->unsignedInteger('book_number');
            $table->unsignedInteger('page_number');
            $table->unsignedInteger('entry_number');
            $table->foreignId('originating_parish_id')->constrained('parishes')->cascadeOnDelete();
            $table->foreignId('performed_by_clergy_id')->nullable()->constrained('clergy')->nullOnDelete();

            $table->string('legitimacy', 40)->nullable();
            $table->text('godparents')->nullable();
            $table->text('witnesses')->nullable();
            $table->string('place_of_event', 160)->nullable();
            $table->text('register_notes')->nullable();
            $table->string('status', 40)->default('registered')->index();
            $table->text('voided_reason')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->unique(
                ['originating_parish_id', 'sacrament_type', 'book_number', 'page_number', 'entry_number'],
                'uq_record_citation'
            );
            $table->index(['originating_parish_id', 'sacrament_type', 'event_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sacramental_records');
    }
};
