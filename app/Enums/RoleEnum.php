<?php

namespace App\Enums;

enum RoleEnum: string
{
    case ADMIN = 'admin';
    case CHANCERY = 'chancery';
    case PARISH_STAFF = 'parish_staff';
    case CLERGY = 'clergy';
    case VIEWER = 'viewer';
    case PARISHIONER = 'parishioner';

    public function label(): string
    {
        return match ($this) {
            self::ADMIN => 'System Administrator',
            self::CHANCERY => 'Chancery Office',
            self::PARISH_STAFF => 'Parish Staff',
            self::CLERGY => 'Clergy',
            self::VIEWER => 'Read-only',
            self::PARISHIONER => 'Parishioner',
        };
    }

    public function isStaff(): bool
    {
        return $this !== self::PARISHIONER;
    }

    public function isParishioner(): bool
    {
        return $this === self::PARISHIONER;
    }

    public function isArchdioceseWide(): bool
    {
        return in_array($this, [self::ADMIN, self::CHANCERY], true);
    }

    public function canManageUsers(): bool
    {
        return $this === self::ADMIN;
    }

    public function canIssueCertificates(): bool
    {
        return in_array($this, [self::ADMIN, self::CHANCERY, self::PARISH_STAFF], true);
    }

    public function canViewRegisters(): bool
    {
        return $this->isStaff();
    }

    public function canViewAnalytics(): bool
    {
        return in_array($this, [self::ADMIN, self::CHANCERY, self::PARISH_STAFF, self::CLERGY], true);
    }

    public function canManageSchedules(): bool
    {
        return in_array($this, [self::ADMIN, self::CHANCERY, self::PARISH_STAFF], true);
    }

    public function canHandleRequests(): bool
    {
        return in_array($this, [self::ADMIN, self::CHANCERY, self::PARISH_STAFF], true);
    }

    public function canViewAuditLog(): bool
    {
        return in_array($this, [self::ADMIN, self::CHANCERY], true);
    }
}
