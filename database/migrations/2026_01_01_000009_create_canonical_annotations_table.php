<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('canonical_annotations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('record_id')->constrained('sacramental_records')->cascadeOnDelete();
            $table->string('annotation_type', 60)->index();
            $table->text('note_text');
            $table->date('event_date')->nullable();
            $table->string('decree_reference', 160)->nullable();
            $table->foreignId('reference_record_id')->nullable()->constrained('sacramental_records')->nullOnDelete();
            $table->foreignId('annotated_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('annotated_at')->nullable();
            $table->timestamps();

            $table->index(['record_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('canonical_annotations');
    }
};
