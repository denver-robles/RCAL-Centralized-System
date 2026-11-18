<?php

namespace App\Services;

use App\Models\CertificateRequest;
use App\Models\Clergy;
use App\Models\SacramentalRecord;
use App\Models\SacramentSchedule;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class AnalyticsService
{
    public function getFullAnalytics(?int $parishId = null, array $filters = []): array
    {
        $descriptive = $this->getDescriptiveMetrics($parishId, $filters);

        // Predictive linear regression forecasting requires a multi-month historical baseline.
        // If descriptive metrics are filtered to a single day or month, preserve the rolling 12-month baseline for forecasting.
        $forecastingSeries = (($filters['period'] ?? 'all') === 'year')
            ? $descriptive['monthly_trends']
            : $this->getMonthlySeries($parishId, 12);

        $predictive = $this->getPredictiveForecast($forecastingSeries, 3);
        $prescriptive = $this->getPrescriptiveRecommendations($descriptive, $predictive, $parishId);

        return [
            'descriptive' => $descriptive,
            'predictive' => $predictive,
            'prescriptive' => $prescriptive,
        ];
    }

    public function getDescriptiveMetrics(?int $parishId = null, array $filters = []): array
    {
        $period = $filters['period'] ?? 'all';
        $year = isset($filters['year']) && is_numeric($filters['year']) ? (int) $filters['year'] : (int) date('Y');
        $month = ! empty($filters['month']) ? $filters['month'] : date('Y-m');
        $date = ! empty($filters['date']) ? $filters['date'] : date('Y-m-d');

        // Canonical Records Query with parish and date filters
        $recordsQuery = SacramentalRecord::query()
            ->when($parishId, fn ($q) => $q->where('originating_parish_id', $parishId));

        $this->applyDateFilter($recordsQuery, $period, $year, $month, $date, 'event_date');

        $recordsByType = (clone $recordsQuery)
            ->select('sacrament_type', DB::raw('COUNT(*) as total'))
            ->groupBy('sacrament_type')
            ->pluck('total', 'sacrament_type')
            ->toArray();

        // Sacrament Schedules Query with parish and date filters
        $scheduleQuery = SacramentSchedule::query()
            ->when($parishId, fn ($q) => $q->where('parish_id', $parishId));

        $this->applyDateFilter($scheduleQuery, $period, $year, $month, $date, 'starts_at');

        $scheduleStats = (clone $scheduleQuery)
            ->select('status', DB::raw('COUNT(*) as total'))
            ->groupBy('status')
            ->pluck('total', 'status')
            ->toArray();

        // Historical / Time-series Trends
        $monthlyTrends = $this->getMonthlySeries($parishId, 12, $filters);

        $counts = array_column($monthlyTrends, 'count');
        $n = count($counts);
        $mean = $n > 0 ? array_sum($counts) / $n : 0;
        $variance = $n > 0
            ? array_sum(array_map(fn ($x) => pow($x - $mean, 2), $counts)) / $n
            : 0;

        // Pending Certificate Requests
        $certQuery = CertificateRequest::query()
            ->when($parishId, fn ($q) => $q->whereHas('record', fn ($r) => $r->where('originating_parish_id', $parishId)))
            ->where('status', 'pending');

        $this->applyDateFilter($certQuery, $period, $year, $month, $date, 'created_at');
        $pendingCertificates = $certQuery->count();

        // Human-readable descriptive filter label
        $filterLabel = match ($period) {
            'year' => "Calendar Year {$year}",
            'month' => Carbon::hasFormat($month, 'Y-m') ? Carbon::createFromFormat('Y-m', $month)->format('F Y') : $month,
            'day' => Carbon::hasFormat($date, 'Y-m-d') ? Carbon::createFromFormat('Y-m-d', $date)->format('F d, Y') : $date,
            default => 'All Time',
        };

        return [
            'records_by_type' => $recordsByType,
            'schedule_stats' => $scheduleStats,
            'monthly_trends' => $monthlyTrends,
            'summary' => [
                'total_records' => array_sum($recordsByType),
                'monthly_average' => round($mean, 2),
                'monthly_std_dev' => round(sqrt($variance), 2),
                'pending_certificates' => $pendingCertificates,
                'active_filter_label' => $filterLabel,
                'filter_period' => $period,
            ],
        ];
    }

    public function getPredictiveForecast(array $historicalTrends, int $monthsToPredict = 3): array
    {
        $n = count($historicalTrends);

        if ($n < 2) {
            return [
                'slope' => 0,
                'trend_direction' => 'insufficient_data',
                'forecast' => [],
            ];
        }

        $x = range(1, $n);
        $y = array_column($historicalTrends, 'count');

        $sumX = array_sum($x);
        $sumY = array_sum($y);
        $sumXY = 0;
        $sumX2 = 0;

        for ($i = 0; $i < $n; $i++) {
            $sumXY += ($x[$i] * $y[$i]);
            $sumX2 += ($x[$i] * $x[$i]);
        }

        $denominator = ($n * $sumX2) - ($sumX * $sumX);
        $slope = $denominator != 0 ? (($n * $sumXY) - ($sumX * $sumY)) / $denominator : 0;
        $intercept = ($sumY - ($slope * $sumX)) / $n;

        $forecast = [];
        $lastDate = Carbon::parse(end($historicalTrends)['month'].'-01');

        for ($step = 1; $step <= $monthsToPredict; $step++) {
            $futureX = $n + $step;
            $predictedValue = max(0, round(($slope * $futureX) + $intercept));
            $futureMonth = $lastDate->copy()->addMonths($step)->format('Y-m');

            $forecast[] = [
                'month' => $futureMonth,
                'predicted_count' => $predictedValue,
                'is_forecast' => true,
            ];
        }

        return [
            'slope' => round($slope, 3),
            'trend_direction' => $slope > 0.2 ? 'upward' : ($slope < -0.2 ? 'downward' : 'stable'),
            'forecast' => $forecast,
        ];
    }

    public function getPrescriptiveRecommendations(array $descriptive, array $predictive, ?int $parishId = null): array
    {
        $recommendations = [];
        $monthlyAvg = $descriptive['summary']['monthly_average'];

        // Rule 1: Group ALL surging forecast months into ONE consolidated card
        $surgeMonths = [];
        $highestPeak = 0;

        foreach ($predictive['forecast'] as $futureMonth) {
            if ($monthlyAvg > 0 && $futureMonth['predicted_count'] > ($monthlyAvg * 1.25)) {
                $surgeMonths[] = "{$futureMonth['month']} ({$futureMonth['predicted_count']} est.)";
                if ($futureMonth['predicted_count'] > $highestPeak) {
                    $highestPeak = $futureMonth['predicted_count'];
                }
            }
        }

        if (! empty($surgeMonths)) {
            $increasePct = round((($highestPeak - $monthlyAvg) / $monthlyAvg) * 100);
            $monthList = implode(', ', $surgeMonths);
            $recommendations[] = [
                'category' => 'Scheduling & Capacity',
                'priority' => 'high',
                'title' => 'Multi-Month Demand Surge Projected',
                'insight' => "Forecasted volume peaks up to {$increasePct}% above the monthly average ({$monthlyAvg}) across: {$monthList}.",
                'action' => 'Open additional weekend sacrament time slots and pre-assign assisting clergy for these upcoming months.',
            ];
        } else {
            // Active scheduling capacity guidance when not in a critical surge
            $totalSchedules = array_sum($descriptive['schedule_stats']);
            $scheduledCount = $descriptive['schedule_stats']['scheduled'] ?? ($descriptive['schedule_stats']['confirmed'] ?? 0);
            $requestedCount = $descriptive['schedule_stats']['requested'] ?? ($descriptive['schedule_stats']['pending'] ?? 0);

            if ($requestedCount > 0 || $scheduledCount > 0) {
                $recommendations[] = [
                    'category' => 'Scheduling & Capacity',
                    'priority' => 'medium',
                    'title' => 'Active Sacrament Booking Management',
                    'insight' => "Parish booking capacity: {$scheduledCount} confirmed booking(s) and {$requestedCount} pending request(s) awaiting action.",
                    'action' => 'Review pending ceremony reservations, confirm presiding clergy availability, and ensure liturgy prep guidelines are sent to parishioners.',
                ];
            } else {
                $recommendations[] = [
                    'category' => 'Scheduling & Capacity',
                    'priority' => 'low',
                    'title' => 'Optimal Scheduling Windows',
                    'insight' => 'Sacrament booking volume is operating within normal parish capacity with no projected overload.',
                    'action' => 'Maintain standard 45-minute sacrament intervals and standard weekend liturgy rotation.',
                ];
            }
        }

        // Rule 2: Dominant Sacrament Resource Allocation (Identifies which specific sacrament drives the load)
        if (! empty($descriptive['records_by_type'])) {
            arsort($descriptive['records_by_type']);
            $topSacrament = array_key_first($descriptive['records_by_type']);
            $topCount = $descriptive['records_by_type'][$topSacrament];
            $totalRecords = $descriptive['summary']['total_records'];

            if ($totalRecords > 0 && ($topCount / $totalRecords) >= 0.45) {
                $sharePct = round(($topCount / $totalRecords) * 100);
                $formattedName = ucfirst($topSacrament);
                $recommendations[] = [
                    'category' => 'Sacrament Focus',
                    'priority' => 'medium',
                    'title' => "High Concentration in {$formattedName} Records ({$sharePct}%)",
                    'insight' => "{$formattedName} accounts for {$topCount} out of {$totalRecords} total sacramental records.",
                    'action' => "Pre-prepare {$formattedName} certificate templates and dedicate a priority seminar/catechism schedule for {$formattedName} applicants.",
                ];
            }
        }

        // Rule 3: Certificate Request Queue Bottleneck
        $pendingCerts = $descriptive['summary']['pending_certificates'];
        if ($pendingCerts >= 15) {
            $recommendations[] = [
                'category' => 'Document Processing',
                'priority' => 'medium',
                'title' => "Certificate Backlog Alert ({$pendingCerts} Pending)",
                'insight' => 'Pending certificate requests have crossed the 15-request operational threshold.',
                'action' => 'Schedule a batch verification and printing window and temporarily assign an extra staff encoder.',
            ];
        }

        // Rule 4: High Cancellation Rate Mitigation
        $totalSchedules = array_sum($descriptive['schedule_stats']);
        $cancelled = $descriptive['schedule_stats']['cancelled'] ?? 0;
        if ($totalSchedules > 0 && ($cancelled / $totalSchedules) > 0.15) {
            $cancelRate = round(($cancelled / $totalSchedules) * 100, 1);
            $recommendations[] = [
                'category' => 'Schedule Reliability',
                'priority' => 'medium',
                'title' => "Elevated Cancellation Rate ({$cancelRate}%)",
                'insight' => "{$cancelled} out of {$totalSchedules} scheduled sacraments ({$cancelRate}%) ended in cancellation.",
                'action' => 'Enforce earlier canonical document verification and trigger automated 48-hour email reminders.',
            ];
        }

        // Rule 5: Clergy Workload Balancing
        $activeClergyCount = Clergy::query()
            ->when($parishId, fn ($q) => $q->whereHas('assignments', fn ($a) => $a->where('parish_id', $parishId)))
            ->count();

        if ($activeClergyCount > 0 && ($monthlyAvg / $activeClergyCount) > 25) {
            $recommendations[] = [
                'category' => 'Clergy Allocation',
                'priority' => 'high',
                'title' => 'High Clergy-to-Sacrament Ratio',
                'insight' => 'Average monthly sacraments per active clergy member exceeds 25 ceremonies.',
                'action' => 'Request guest/visiting clergy support from neighboring vicariate parishes for peak weekends.',
            ];
        }

        // Default Baseline
        if (empty($recommendations)) {
            $recommendations[] = [
                'category' => 'System Status',
                'priority' => 'low',
                'title' => 'Optimal Parish Operations',
                'insight' => 'Projected sacrament demand, clergy ratios, and certificate queues are within normal thresholds.',
                'action' => 'Maintain current scheduling intervals and standard staff rotation.',
            ];
        }

        return $recommendations;
    }

    private function getMonthlySeries(?int $parishId, int $months, array $filters = []): array
    {
        $period = $filters['period'] ?? 'all';
        $year = isset($filters['year']) && is_numeric($filters['year']) ? (int) $filters['year'] : (int) date('Y');

        // PostgreSQL uses TO_CHAR, SQLite uses strftime, MySQL uses DATE_FORMAT
        $dateFormat = match (DB::getDriverName()) {
            'pgsql' => "TO_CHAR(created_at, 'YYYY-MM')",
            'sqlite' => "strftime('%Y-%m', created_at)",
            default => "DATE_FORMAT(created_at, '%Y-%m')",
        };

        if ($period === 'year') {
            // Display all 12 calendar months for the specified year
            $raw = SacramentalRecord::query()
                ->when($parishId, fn ($q) => $q->where('originating_parish_id', $parishId))
                ->whereYear('created_at', $year)
                ->select(DB::raw("$dateFormat as month"), DB::raw('COUNT(*) as count'))
                ->groupBy('month')
                ->pluck('count', 'month')
                ->toArray();

            $series = [];
            for ($m = 1; $m <= 12; $m++) {
                $monthKey = sprintf('%04d-%02d', $year, $m);
                $series[] = [
                    'month' => $monthKey,
                    'count' => (int) ($raw[$monthKey] ?? 0),
                    'is_forecast' => false,
                ];
            }

            return $series;
        }

        // Default: rolling $months window (e.g. past 12 months)
        $startDate = Carbon::now()->subMonths($months - 1)->startOfMonth();

        $raw = SacramentalRecord::query()
            ->when($parishId, fn ($q) => $q->where('originating_parish_id', $parishId))
            ->where('created_at', '>=', $startDate)
            ->select(DB::raw("$dateFormat as month"), DB::raw('COUNT(*) as count'))
            ->groupBy('month')
            ->pluck('count', 'month')
            ->toArray();

        $series = [];
        for ($i = 0; $i < $months; $i++) {
            $monthKey = $startDate->copy()->addMonths($i)->format('Y-m');
            $series[] = [
                'month' => $monthKey,
                'count' => (int) ($raw[$monthKey] ?? 0),
                'is_forecast' => false,
            ];
        }

        return $series;
    }

    private function applyDateFilter(
        $query,
        string $period,
        int $year,
        string $monthStr,
        string $dateStr,
        string $primaryColumn = 'event_date'
    ): void {
        if ($period === 'all') {
            return;
        }

        if ($period === 'year') {
            $query->where(function ($q) use ($primaryColumn, $year) {
                $q->whereYear($primaryColumn, $year);
                if ($primaryColumn === 'event_date') {
                    $q->orWhereYear('created_at', $year);
                }
            });

            return;
        }

        if ($period === 'month') {
            $parts = explode('-', $monthStr);
            $mYear = isset($parts[0]) && is_numeric($parts[0]) ? (int) $parts[0] : $year;
            $mMonth = isset($parts[1]) && is_numeric($parts[1]) ? (int) $parts[1] : (int) date('m');

            $query->where(function ($q) use ($primaryColumn, $mYear, $mMonth) {
                $q->where(function ($sub) use ($primaryColumn, $mYear, $mMonth) {
                    $sub->whereYear($primaryColumn, $mYear)->whereMonth($primaryColumn, $mMonth);
                });
                if ($primaryColumn === 'event_date') {
                    $q->orWhere(function ($sub) use ($mYear, $mMonth) {
                        $sub->whereYear('created_at', $mYear)->whereMonth('created_at', $mMonth);
                    });
                }
            });

            return;
        }

        if ($period === 'day') {
            $query->where(function ($q) use ($primaryColumn, $dateStr) {
                $q->whereDate($primaryColumn, $dateStr);
                if ($primaryColumn === 'event_date') {
                    $q->orWhereDate('created_at', $dateStr);
                }
            });
        }
    }
}
