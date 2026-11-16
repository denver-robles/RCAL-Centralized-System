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
        Schema::create('transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('parish_id')->constrained('parishes')->cascadeOnDelete();
            $table->string('reference_no')->unique(); // OR-013915 or CV-2026-089
            $table->date('transaction_date');
            $table->enum('type', ['receipt', 'check', 'deposit']);
            $table->string('contact_name')->nullable(); // Received From / Payee
            $table->text('description')->nullable(); // Particulars
            $table->enum('status', ['draft', 'pending_approval', 'posted'])->default('draft');

            // Workflow tracking (Foreign keys to users table)
            $table->foreignId('prepared_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('checked_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();

            $table->timestamps();

            $table->index(['parish_id', 'transaction_date']);
            $table->index('status');
            $table->index('type');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('transactions');
    }
};
