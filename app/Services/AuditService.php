<?php

namespace App\Services;

use App\Enums\AuditActionEnum;
use App\Models\AccessLog;
use App\Models\AuditLog;
use App\Models\SacramentalRecord;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class AuditService
{
    /**
     * Resolves the real originating client IP address through reverse proxies.
     */
    public static function clientIp(): ?string
    {
        $request = request();
        if (!$request) {
            return null;
        }

        foreach (['X-Forwarded-For', 'X-Real-IP'] as $header) {
            $value = $request->header($header);
            if ($value) {
                return trim(explode(',', $value)[0]);
            }
        }

        return $request->ip();
    }

    /**
     * Convenience method to log an action with an optional request.
     */
    public static function log(
        $request,
        AuditActionEnum $action,
        ?string $subjectType = null,
        ?int $subjectId = null,
        ?string $note = null,
        ?User $user = null
    ): ?AuditLog {
        return self::record(
            action: $action,
            subject: $subjectType,
            note: $note,
            user: $user,
            subjectLabel: $subjectType && $subjectId ? "{$subjectType} #{$subjectId}" : null
        );
    }

    /**
     * Append one uniform row to the audit trail (RA 10173 compliance).
     * Never throws an exception to avoid rolling back valid ecclesiastical transactions.
     */
    public static function record(
        AuditActionEnum $action,
        Model|string|null $subject = null,
        ?array $oldValues = null,
        ?array $newValues = null,
        ?string $note = null,
        ?User $user = null,
        ?string $actorUsername = null,
        ?string $subjectLabel = null
    ): ?AuditLog {
        try {
            $user = $user ?: Auth::user();
            $actorUsername = $actorUsername ?: ($user ? $user->username : null);

            $subjectType = null;
            $subjectId = null;

            if ($subject instanceof Model) {
                $subjectType = class_basename($subject);
                $subjectId = $subject->getKey();
                $subjectLabel = $subjectLabel ?: "{$subjectType} #{$subjectId}";
            } elseif (is_string($subject)) {
                $subjectType = $subject;
            }

            $request = request();

            return AuditLog::create([
                'user_id' => $user?->id,
                'actor_username' => $actorUsername,
                'action' => $action,
                'subject_type' => $subjectType,
                'subject_id' => $subjectId,
                'subject_label' => $subjectLabel,
                'old_values' => $oldValues,
                'new_values' => $newValues,
                'ip_address' => self::clientIp(),
                'user_agent' => $request ? substr($request->userAgent() ?? '', 0, 255) : null,
                'request_path' => $request ? substr($request->path(), 0, 255) : null,
                'request_method' => $request ? substr($request->method(), 0, 10) : null,
                'note' => $note,
                'created_at' => now(),
            ]);
        } catch (\Throwable $e) {
            Log::error("Audit logging failure: {$e->getMessage()}", [
                'action' => $action->value,
                'exception' => $e,
            ]);
            return null;
        }
    }

    /**
     * Records access to a sensitive sacramental register row under RA 10173.
     */
    public static function logAccess(User $user, SacramentalRecord $record, string $action = 'view'): void
    {
        try {
            AccessLog::create([
                'user_id' => $user->id,
                'record_id' => $record->id,
                'action' => $action,
                'created_at' => now(),
            ]);
        } catch (\Throwable $e) {
            Log::warning("Failed to log sacramental record access: {$e->getMessage()}");
        }
    }
}
