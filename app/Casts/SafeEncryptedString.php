<?php

namespace App\Casts;

use Illuminate\Contracts\Database\Eloquent\CastsAttributes;
use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Crypt;

class SafeEncryptedString implements CastsAttributes
{
    /**
     * Cast the given value from storage.
     * Gracefully falls back to raw value if the string was stored unencrypted before encryption was enabled.
     *
     * @param  array<string, mixed>  $attributes
     */
    public function get(Model $model, string $key, mixed $value, array $attributes): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        try {
            return Crypt::decryptString($value);
        } catch (DecryptException) {
            // Graceful fallback for legacy records stored prior to encryption hardening
            return $value;
        }
    }

    /**
     * Prepare the given value for encrypted storage.
     *
     * @param  array<string, mixed>  $attributes
     */
    public function set(Model $model, string $key, mixed $value, array $attributes): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        // Guard against double encryption
        try {
            Crypt::decryptString($value);
            return $value;
        } catch (DecryptException) {
            return Crypt::encryptString($value);
        }
    }
}
