<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('actor_username', 80)->nullable()->index();
            $table->string('action', 40)->index();

            // Generic auditable polymorphic subject reference
            $table->string('subject_type', 80)->nullable();
            $table->unsignedBigInteger('subject_id')->nullable();
            $table->string('subject_label', 255)->nullable();

            // Pre/Post mutation payload snapshots
            $table->json('old_values')->nullable();
            $table->json('new_values')->nullable();

            // Client and network telemetry (RA 10173 accountable location tracing)
            $table->string('ip_address', 45)->nullable();
            $table->string('user_agent', 255)->nullable();
            $table->string('request_path', 255)->nullable();
            $table->string('request_method', 10)->nullable();
            $table->text('note')->nullable();

            $table->timestamp('created_at')->useCurrent()->index();

            $table->index(['user_id', 'created_at'], 'ix_audit_user_created');
            $table->index(['subject_type', 'subject_id'], 'ix_audit_subject');
            $table->index(['action', 'created_at'], 'ix_audit_action_created');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
    }
};
