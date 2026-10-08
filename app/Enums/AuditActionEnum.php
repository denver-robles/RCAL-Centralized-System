<?php

namespace App\Enums;

enum AuditActionEnum: string
{
    case LOGIN = 'login';
    case LOGIN_FAILED = 'login_failed';
    case LOGOUT = 'logout';
    case VIEW = 'view';
    case CREATE = 'create';
    case UPDATE = 'update';
    case PRINT = 'print';
    case EXPORT = 'export';
    case STATUS_CHANGE = 'status_change';
    case ANNOTATE = 'annotate';
    case UPLOAD = 'upload';
    case DELETE = 'delete';

    public function label(): string
    {
        return match ($this) {
            self::LOGIN => 'Signed in',
            self::LOGIN_FAILED => 'Sign-in failed',
            self::LOGOUT => 'Signed out',
            self::VIEW => 'Viewed',
            self::CREATE => 'Created',
            self::UPDATE => 'Edited',
            self::PRINT => 'Printed',
            self::EXPORT => 'Exported',
            self::STATUS_CHANGE => 'Status changed',
            self::ANNOTATE => 'Margin note added',
            self::UPLOAD => 'Document uploaded',
            self::DELETE => 'Deleted',
        };
    }

    public function isMutation(): bool
    {
        return in_array($this, [
            self::CREATE,
            self::UPDATE,
            self::STATUS_CHANGE,
            self::ANNOTATE,
            self::DELETE,
            self::UPLOAD,
        ], true);
    }
}
