<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('parishes', function (Blueprint $table) {
            $table->id();
            $table->string('name', 160)->unique()->index();
            $table->string('patron_saint', 160)->nullable();
            $table->string('feast_day', 80)->nullable();
            $table->foreignId('vicariate_id')->constrained('vicariates')->cascadeOnDelete();
            $table->string('address', 300)->nullable();
            $table->string('municipality', 120)->nullable()->index();
            $table->string('city_municipality', 120)->nullable();
            $table->string('contact_number', 30)->nullable();
            $table->string('phone', 30)->nullable();
            $table->string('email', 255)->nullable();
            $table->unsignedSmallInteger('established_year')->nullable();
            $table->boolean('is_active')->default(true)->index();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('parishes');
    }
};
