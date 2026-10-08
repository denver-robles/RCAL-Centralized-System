<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('clergy_assignments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('clergy_id')->constrained('clergy')->cascadeOnDelete();
            $table->foreignId('parish_id')->constrained('parishes')->cascadeOnDelete();
            $table->string('role', 60)->default('parish_priest');
            $table->date('assigned_from');
            $table->date('assigned_to')->nullable();
            $table->timestamps();

            $table->index(['clergy_id', 'parish_id']);
            $table->index(['parish_id', 'assigned_to']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('clergy_assignments');
    }
};
