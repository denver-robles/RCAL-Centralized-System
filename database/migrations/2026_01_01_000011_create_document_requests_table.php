<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('document_requests', function (Blueprint $table) {
            $table->id();
            $table->string('tracking_code', 40)->unique()->index();
            $table->foreignId('parishioner_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('targeted_parish_id')->nullable()->constrained('parishes')->nullOnDelete();

            $table->string('sacrament_type', 40)->index();
            $table->string('name_on_record', 160)->index();
            $table->date('date_of_birth')->nullable();
            $table->date('date_of_sacrament')->nullable();
            $table->string('place_of_sacrament', 160)->nullable();
            $table->string('parents_or_spouse', 255)->nullable();
            $table->string('relationship_to_owner', 80)->nullable();
            $table->string('purpose', 255)->nullable();

            $table->string('status', 40)->default('submitted')->index();
            $table->foreignId('matched_record_id')->nullable()->constrained('sacramental_records')->nullOnDelete();
            $table->foreignId('certificate_request_id')->nullable()->constrained('certificate_requests')->nullOnDelete();
            $table->string('id_document_path', 255)->nullable();

            // Data Privacy (RA 10173) explicit consent fields
            $table->timestamp('consent_given_at')->nullable();
            $table->string('consent_version', 20)->default('1.0');

            // Verification hash & resolution notes
            $table->string('verification_hash', 128)->nullable();
            $table->text('rejection_reason')->nullable();
            $table->text('cancellation_reason')->nullable();
            $table->text('internal_note')->nullable();
            $table->timestamp('issued_at')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->index(['parishioner_id', 'status']);
            $table->index(['targeted_parish_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('document_requests');
    }
};
