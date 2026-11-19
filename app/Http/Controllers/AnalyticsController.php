<?php

namespace App\Http\Controllers;

use App\Models\Parish;
use App\Services\AnalyticsService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AnalyticsController extends Controller
{
    public function __construct(
        protected AnalyticsService $analyticsService
    ) {}

    public function index(Request $request): Response
    {
        $user = $request->user();
        $isArchdiocese = $user->isArchdioceseWide();

        // Security enforcement: Parish staff can ONLY access their own home parish.
        // Even if staff manually inputs ?parish_id= in the URL, force their home_parish_id.
        $parishId = $isArchdiocese
            ? ($request->filled('parish_id') ? $request->integer('parish_id') : null)
            : $user->home_parish_id;

        // Parse date filter parameters (all, year, month, day)
        $filters = [
            'parish_id' => $parishId,
            'period' => $request->input('period', 'all'),
            'year' => (int) $request->input('year', date('Y')),
            'month' => $request->input('month', date('Y-m')),
            'date' => $request->input('date', date('Y-m-d')),
        ];

        // Compute both analytics tabs with applied parish and date filters
        $analytics = $this->analyticsService->getFullAnalytics($parishId, $filters);

        // For archdiocese leaders, supply all parishes for selection.
        // For parish staff, supply only their home parish so they cannot view or switch to others.
        $parishes = $isArchdiocese
            ? Parish::query()->orderBy('name')->get(['id', 'name'])
            : ($user->homeParish ? collect([['id' => $user->homeParish->id, 'name' => $user->homeParish->name]]) : collect());

        $currentYear = (int) date('Y');
        $availableYears = range($currentYear, $currentYear - 5);

        return Inertia::render('Analytics/Index', [
            'sacraments' => $analytics['sacraments'],
            'finance' => $analytics['finance'],
            'parishes' => $parishes,
            'isArchdioceseWide' => $isArchdiocese,
            'userHomeParish' => $user->homeParish ? ['id' => $user->homeParish->id, 'name' => $user->homeParish->name] : null,
            'availableYears' => $availableYears,
            'filters' => $filters,
        ]);
    }
}
