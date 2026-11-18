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
        private readonly AnalyticsService $analyticsService
    ) {}

    public function index(Request $request): Response
    {
        $user = $request->user();

        // Chancery/Admin can select any parish or view archdiocese-wide; parish staff is strictly restricted to their home parish
        $parishId = $user->isArchdioceseWide()
            ? ($request->filled('parish_id') ? $request->integer('parish_id') : null)
            : $user->home_parish_id;

        $period = in_array($request->input('period'), ['all', 'year', 'month', 'day'], true)
            ? $request->input('period')
            : 'all';

        $year = $request->filled('year') && is_numeric($request->input('year'))
            ? (int) $request->input('year')
            : (int) date('Y');

        $month = $request->input('month', date('Y-m'));
        $date = $request->input('date', date('Y-m-d'));

        $filters = [
            'parish_id' => $parishId ? (string) $parishId : '',
            'period' => $period,
            'year' => (string) $year,
            'month' => $month,
            'date' => $date,
        ];

        $analytics = $this->analyticsService->getFullAnalytics($parishId, $filters);

        $parishes = $user->isArchdioceseWide()
            ? Parish::query()->where('is_active', true)->orderBy('name')->get(['id', 'name', 'municipality', 'city_municipality'])
            : ($user->homeParish ? collect([$user->homeParish]) : collect());

        $scopedParish = $parishId ? Parish::find($parishId) : null;

        $currentYear = (int) date('Y');
        $availableYears = range($currentYear, $currentYear - 5);

        return Inertia::render('Analytics/Index', [
            'descriptive' => $analytics['descriptive'],
            'predictive' => $analytics['predictive'],
            'prescriptive' => $analytics['prescriptive'],
            'parishes' => $parishes,
            'scopedParish' => $scopedParish,
            'availableYears' => $availableYears,
            'filters' => $filters,
        ]);
    }
}
