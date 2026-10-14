<?php

namespace App\Http\Middleware;

use App\Services\ParishScopingService;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $user = $request->user();
        $scopedParish = ParishScopingService::visibleParish($user);

        return [
            ...parent::share($request),
            'auth' => [
                'user' => $user ? [
                    'id' => $user->id,
                    'username' => $user->username,
                    'email' => $user->email,
                    'display_name' => $user->display_name_or_username,
                    'role' => $user->role?->value,
                    'role_label' => $user->role?->label(),
                    'is_staff' => $user->isStaff(),
                    'is_parishioner' => $user->isParishioner(),
                    'is_archdiocese_wide' => $user->isArchdioceseWide(),
                    'can_issue_certificates' => $user->canIssueCertificates(),
                    'home_parish_id' => $user->home_parish_id,
                    'home_parish_name' => $scopedParish?->name,
                    'identity_status' => $user->identity_status ?? 'unverified',
                    'id_verified_at' => $user->id_verified_at?->toIso8601String(),
                    'first_name' => $user->first_name,
                    'middle_name' => $user->middle_name,
                    'last_name' => $user->last_name,
                    'name_suffix' => $user->name_suffix,
                    'date_of_birth' => $user->date_of_birth?->format('Y-m-d'),
                    'extracted_id_type' => $user->extracted_id_type,
                    'id_number_masked' => $user->id_number_masked,
                    'has_face_reference' => $user->hasFaceReference(),
                ] : null,
            ],
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
                'warning' => fn () => $request->session()->get('warning'),
            ],
            'curia' => [
                'name' => 'Roman Catholic Archdiocese of Lipa',
                'operating_hours' => 'Curia Chancery • Mon–Fri 8AM–5PM',
                'current_date' => now()->format('l, F j, Y'),
            ],
        ];
    }
}
