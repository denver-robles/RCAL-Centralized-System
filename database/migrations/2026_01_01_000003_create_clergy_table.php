<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('clergy', function (Blueprint $table) {
            $table->id();
            $table->string('first_name', 80)->index();
            $table->string('middle_name', 80)->nullable();
            $table->string('last_name', 80)->index();
            $table->string('suffix', 20)->nullable();
            $table->string('title', 40)->default('father');
            $table->string('sex', 20)->default('male');
            $table->date('date_of_birth')->nullable();
            $table->date('ordination_date')->nullable();
            $table->date('date_of_death')->nullable();
            $table->string('status', 40)->default('active');
            $table->boolean('is_active')->default(true)->index();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('clergy');
    }
};
