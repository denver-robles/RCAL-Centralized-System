<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use App\Casts\SafeEncryptedString;
use App\Enums\RoleEnum;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    use HasFactory, Notifiable, SoftDeletes;

    protected $fillable = [
        'username',
        'email',
        'display_name',
        'first_name',
        'middle_name',
        'last_name',
        'name_suffix',
        'date_of_birth',
        'role',
        'password',
        'must_change_password',
        'home_parish_id',
        'clergy_id',
        'phone',
        'postal_address',
        'email_verified_at',
        'phone_verified_at',
        'is_active',
        'last_login_at',
        'stripe_verification_session_id',
        'identity_status',
        'id_verified_at',
        'extracted_id_type',
        'id_number_masked',
        'extracted_id_details',
        'face_reference_image',
    ];

    protected $hidden = [
        'password',
        'remember_token',
        'face_reference_image',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'phone_verified_at' => 'datetime',
            'last_login_at' => 'datetime',
            'password' => 'hashed',
            'must_change_password' => 'boolean',
            'role' => RoleEnum::class,
            'is_active' => 'boolean',
            'id_verified_at' => 'datetime',
            'date_of_birth' => 'date',
            'extracted_id_details' => 'array',
            'face_reference_image' => SafeEncryptedString::class,
        ];
    }

    public function homeParish(): BelongsTo
    {
        return $this->belongsTo(Parish::class, 'home_parish_id');
    }

    public function clergyRecord(): BelongsTo
    {
        return $this->belongsTo(Clergy::class, 'clergy_id');
    }

    public function documentRequests(): HasMany
    {
        return $this->hasMany(DocumentRequest::class, 'parishioner_id');
    }

    public function auditLogs(): HasMany
    {
        return $this->hasMany(AuditLog::class, 'user_id');
    }

    public function accessLogs(): HasMany
    {
        return $this->hasMany(AccessLog::class, 'user_id');
    }

    public function isStaff(): bool
    {
        return $this->role?->isStaff() ?? false;
    }

    public function isParishioner(): bool
    {
        return $this->role?->isParishioner() ?? true;
    }

    public function isArchdioceseWide(): bool
    {
        return $this->role?->isArchdioceseWide() ?? false;
    }

    public function isAdmin(): bool
    {
        return $this->role === RoleEnum::ADMIN;
    }

    public function canManageUsers(): bool
    {
        return $this->role?->canManageUsers() ?? false;
    }

    public function canIssueCertificates(): bool
    {
        return $this->role?->canIssueCertificates() ?? false;
    }

    public function getDisplayNameOrUsernameAttribute(): string
    {
        return $this->display_name ?: $this->username;
    }

    public function hasFaceReference(): bool
    {
        return !empty($this->face_reference_image);
    }
}
