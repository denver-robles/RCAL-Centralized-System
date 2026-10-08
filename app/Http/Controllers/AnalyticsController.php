<?php

namespace App\Http\Controllers;

use App\Enums\SacramentTypeEnum;
use App\Models\CertificateRequest;
use App\Models\Parish;
use App\Models\SacramentalRecord;
use App\Models\Vicariate;
use App\Services\ParishScopingService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class AnalyticsController extends Controller
{
    /**
     * Display Curia analytics and Archdiocesan overview dashboard.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();

        $archdioceseCounts = ParishScopingService::archdioceseCounts();
        $sacramentCounts = ParishScopingService::sacramentCounts($user);
        $requestStats = ParishScopingService::combinedRequestStats($user);

        // Vicariate breakdown
        $vicariatesData = Vicariate::withCount(['parishes'])->get()->map(function ($vicariate) {
            $recordCount = SacramentalRecord::whereHas('originatingParish', function ($q) use ($vicariate) {
                $q->where('vicariate_id', $vicariate->id);
            })->count();

            return [
                'id' => $vicariate->id,
                'name' => $vicariate->name,
                'parishes_count' => $vicariate->parishes_count,
                'records_count' => $recordCount,
            ];
        });

        // Top Parishes by recorded sacramental entries
        $topParishes = Parish::query()
            ->withCount('sacramentalRecords')
            ->orderByDesc('sacramental_records_count')
            ->take(8)
            ->get(['id', 'name', 'city_municipality', 'sacramental_records_count']);

        return Inertia::render('Analytics/Index', [
            'archdioceseCounts' => $archdioceseCounts,
            'sacramentCounts' => $sacramentCounts,
            'requestStats' => $requestStats,
            'vicariatesData' => $vicariatesData,
            'topParishes' => $topParishes,
        ]);
    }
}
