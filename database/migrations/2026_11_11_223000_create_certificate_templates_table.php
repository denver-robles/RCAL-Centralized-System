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
        Schema::create('certificate_templates', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('filename');
            $table->json('placeholders');
            $table->json('locked_elements')->nullable();
            $table->enum('paper_size', ['short', 'a4'])->default('short');
            $table->unsignedBigInteger('parish_id');
            $table->foreign('parish_id')->references('id')
                ->on('parishes')->cascadeOnDelete();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('certificate_templates');
    }
};
