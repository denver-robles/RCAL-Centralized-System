<?php

namespace App\Http\Controllers;

use App\Models\CertificateRequest;
use App\Models\Clergy;
use App\Models\Parish;
use App\Models\SacramentalRecord;
use App\Models\SacramentSchedule;
use App\Services\ParishScopingService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        
        $stats = ParishScopingService::combinedRequestStats($user);
        $sacramentCounts = ParishScopingService::sacramentCounts($user);

        // Urgent certificate queue requiring staff verification, approval, or seal
        $urgentCertificates = CertificateRequest::query()
            ->with(['record.person', 'record.originatingParish'])
            ->when(!$user->isArchdioceseWide(), function ($q) use ($user) {
                $q->whereHas('record', fn($rq) => $rq->where('originating_parish_id', $user->home_parish_id));
            })
            ->whereIn('status', ['pending', 'verified', 'approved', 'ready'])
            ->orderBy('created_at', 'desc')
            ->limit(5)
            ->get();

        // Upcoming sacrament ceremonies & pastoral timetable
        $upcomingSchedules = SacramentSchedule::query()
            ->with(['presidingClergy', 'parish', 'venue'])
            ->when(!$user->isArchdioceseWide(), function ($q) use ($user) {
                $q->where('parish_id', $user->home_parish_id);
            })
            ->where('starts_at', '>=', now()->startOfDay())
            ->orderBy('starts_at', 'asc')
            ->limit(5)
            ->get();

        // Recent inscribed canonical folios (Canon 535)
        $recentRecords = SacramentalRecord::query()
            ->with(['person', 'originatingParish'])
            ->when(!$user->isArchdioceseWide(), function ($q) use ($user) {
                $q->where('originating_parish_id', $user->home_parish_id);
            })
            ->orderBy('created_at', 'desc')
            ->limit(5)
            ->get();

        // Diocesan & Parish KPI Overview
        $kpiOverview = [
            'totalRecords' => SacramentalRecord::when(!$user->isArchdioceseWide(), fn($q) => $q->where('originating_parish_id', $user->home_parish_id))->count(),
            'openCertificates' => $stats['open'],
            'activeSchedules' => SacramentSchedule::when(!$user->isArchdioceseWide(), fn($q) => $q->where('parish_id', $user->home_parish_id))->whereIn('status', ['pending', 'confirmed'])->count(),
            'parishesCount' => Parish::where('is_active', true)->count(),
            'clergyCount' => Clergy::where('is_active', true)->count(),
        ];
        
        return Inertia::render('Staff/Dashboard', [
            'stats' => $stats,
            'sacramentCounts' => $sacramentCounts,
            'urgentCertificates' => $urgentCertificates,
            'upcomingSchedules' => $upcomingSchedules,
            'recentRecords' => $recentRecords,
            'kpiOverview' => $kpiOverview,
        ]);
    }
}
