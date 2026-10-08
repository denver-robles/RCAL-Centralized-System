<?php

namespace App\Services;

use App\Enums\DocumentRequestStatusEnum;
use App\Enums\RequestStatusEnum;
use App\Enums\RoleEnum;
use App\Enums\SacramentTypeEnum;
use App\Models\CertificateRequest;
use App\Models\Clergy;
use App\Models\ClergyAssignment;
use App\Models\DocumentRequest;
use App\Models\Parish;
use App\Models\Person;
use App\Models\SacramentalRecord;
use App\Models\User;
use App\Models\Vicariate;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

class ParishScopingService
{
    /**
     * Resolves the parish the user is restricted to, or null for archdiocese-wide access.
     */
    public static function visibleParish(?User $user): ?Parish
    {
        if (!$user) {
            return null;
        }

        if ($user->isArchdioceseWide()) {
            return null;
        }

        return $user->homeParish;
    }

    /**
     * Applies multi-tenant parish scoping filter to an Eloquent query builder.
     */
    public static function scopeParish(Builder $query, ?User $user, string $column = 'originating_parish_id'): Builder
    {
        if (!$user || $user->isArchdioceseWide()) {
            return $query;
        }

        return $query->where($column, $user->home_parish_id);
    }

    public static function canViewRecord(?User $user, SacramentalRecord $record): bool
    {
        if (!$user) {
            return false;
        }

        if ($user->isArchdioceseWide()) {
            return true;
        }

        return (int)$user->home_parish_id === (int)$record->originating_parish_id;
    }

    public static function canWriteRecord(?User $user, SacramentalRecord $record): bool
    {
        if (!$user) {
            return false;
        }

        if ($user->isArchdioceseWide()) {
            return true;
        }

        return (int)$user->home_parish_id === (int)$record->originating_parish_id;
    }

    /**
     * Headline analytics figures across the archdiocese.
     */
    public static function archdioceseCounts(): array
    {
        return [
            'parishes' => Parish::count(),
            'vicariates' => Vicariate::count(),
            'municipalities' => Parish::whereNotNull('municipality')->distinct('municipality')->count('municipality'),
            'priests' => ClergyAssignment::whereNull('assigned_to')->distinct('clergy_id')->count('clergy_id'),
            'clergy' => Clergy::where('is_active', true)->count(),
            'records' => SacramentalRecord::count(),
            'persons' => Person::count(),
        ];
    }

    /**
     * Sacrament breakdown counts.
     */
    public static function sacramentCounts(?User $user = null): array
    {
        $query = SacramentalRecord::query();
        if ($user && !$user->isArchdioceseWide()) {
            $query->where('originating_parish_id', $user->home_parish_id);
        }

        $rawCounts = $query->select('sacrament_type', DB::raw('count(*) as count'))
            ->groupBy('sacrament_type')
            ->pluck('count', 'sacrament_type')
            ->toArray();

        $result = [];
        foreach (SacramentTypeEnum::cases() as $sacrament) {
            $result[$sacrament->value] = $rawCounts[$sacrament->value] ?? 0;
        }

        return $result;
    }

    /**
     * Combined statistics for certificate requests and public document claims.
     */
    public static function combinedRequestStats(?User $user = null): array
    {
        $certQuery = CertificateRequest::query();
        $docQuery = DocumentRequest::query();

        if ($user && !$user->isArchdioceseWide()) {
            $certQuery->whereHas('record', fn($q) => $q->where('originating_parish_id', $user->home_parish_id));
            $docQuery->where(function ($q) use ($user) {
                $q->where('targeted_parish_id', $user->home_parish_id)
                  ->orWhereHas('matchedRecord', fn ($rq) => $rq->where('originating_parish_id', $user->home_parish_id));
            });
        }

        $certs = $certQuery->get();
        $docs = $docQuery->get();

        $certOpen = $certs->filter(fn($c) => $c->isOpen)->count();
        $docOpen = $docs->filter(fn($d) => $d->isOpen && !$d->certificate_request_id)->count();

        $issued = $certs->where('status', RequestStatusEnum::ISSUED)->count() +
                  $docs->where('status', DocumentRequestStatusEnum::COMPLETED)->count();

        $pending = $certs->where('status', RequestStatusEnum::PENDING)->count() +
                   $docs->whereIn('status', [DocumentRequestStatusEnum::SUBMITTED, DocumentRequestStatusEnum::UNDER_REVIEW])->count();

        $rejected = $certs->whereIn('status', [RequestStatusEnum::REJECTED, RequestStatusEnum::CANCELLED])->count() +
                    $docs->whereIn('status', [DocumentRequestStatusEnum::REJECTED, DocumentRequestStatusEnum::CANCELLED, DocumentRequestStatusEnum::RECORD_NOT_FOUND])->count();

        return [
            'open' => $certOpen + $docOpen,
            'issued' => $issued,
            'pending' => $pending,
            'rejected' => $rejected,
            'total' => $certs->count() + $docs->count(),
            'cert_total' => $certs->count(),
            'doc_total' => $docs->count(),
        ];
    }
}
