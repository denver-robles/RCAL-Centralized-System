<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::table('users', function (Blueprint $table) {
            $table->string('stripe_verification_session_id')->nullable()->index();
            $table->string('identity_status')->default('unverified'); // unverified, pending, verified, requires_input
            $table->timestamp('id_verified_at')->nullable();
        });
    }

    public function down(): void {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['stripe_verification_session_id', 'identity_status', 'id_verified_at']);
        });
    }
};