<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('access_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('record_id')->constrained('sacramental_records')->cascadeOnDelete();
            $table->string('action', 40)->default('view');
            $table->timestamp('created_at')->useCurrent()->index();

            $table->index(['record_id', 'created_at'], 'ix_access_record_created');
            $table->index(['user_id', 'created_at'], 'ix_access_user_created');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('access_logs');
    }
};
