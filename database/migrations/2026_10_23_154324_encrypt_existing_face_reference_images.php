<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Contracts\Encryption\DecryptException;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $users = DB::table('users')->whereNotNull('face_reference_image')->get();

        foreach ($users as $user) {
            $raw = $user->face_reference_image;
            if (!$raw) {
                continue;
            }

            try {
                // If it can already be decrypted, leave as-is
                Crypt::decryptString($raw);
            } catch (DecryptException) {
                // Was stored as raw unencrypted base64 string -> encrypt it now
                DB::table('users')->where('id', $user->id)->update([
                    'face_reference_image' => Crypt::encryptString($raw),
                ]);
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $users = DB::table('users')->whereNotNull('face_reference_image')->get();

        foreach ($users as $user) {
            $raw = $user->face_reference_image;
            if (!$raw) {
                continue;
            }

            try {
                $decrypted = Crypt::decryptString($raw);
                DB::table('users')->where('id', $user->id)->update([
                    'face_reference_image' => $decrypted,
                ]);
            } catch (DecryptException) {
                // Already raw or cannot be decrypted
            }
        }
    }
};
