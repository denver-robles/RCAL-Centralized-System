<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('persons', function (Blueprint $table) {
            $table->id();
            $table->string('first_name', 80)->index();
            $table->string('middle_name', 80)->nullable();
            $table->string('last_name', 80)->index();
            $table->string('suffix', 20)->nullable();
            $table->string('sex', 20);
            $table->date('date_of_birth')->nullable();
            $table->string('place_of_birth', 160)->nullable();
            $table->date('date_of_death')->nullable();
            $table->string('father_name', 160)->nullable();
            $table->string('mother_name', 160)->nullable();
            $table->foreignId('father_id')->nullable()->constrained('persons')->nullOnDelete();
            $table->foreignId('mother_id')->nullable()->constrained('persons')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('persons');
    }
};
