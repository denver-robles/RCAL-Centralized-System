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
    public function getFullAnalytics(?int $parishId = null): array
    {
        $descriptive = $this->getDescriptiveMetrics($parishId);
        $predictive = $this->getPredictiveForecast($descriptive['monthly_trends'], 3);
        $prescriptive = $this->getPrescriptiveRecommendations($descriptive, $predictive, $parishId);

        return [
            'descriptive' => $descriptive,
            'predictive' => $predictive,
            'prescriptive' => $prescriptive,
        ];
    }

    public function getDescriptiveMetrics(?int $parishId = null): array
    {
        $recordsByType = SacramentalRecord::query()
            ->when($parishId, fn ($q) => $q->where('originating_parish_id', $parishId))
            ->select('sacrament_type', DB::raw('COUNT(*) as total'))
            ->groupBy('sacrament_type')
            ->pluck('total', 'sacrament_type')
            ->toArray();

        $scheduleStats = SacramentSchedule::query()
            ->when($parishId, fn ($q) => $q->where('parish_id', $parishId))
            ->select('status', DB::raw('COUNT(*) as total'))
            ->groupBy('status')
            ->pluck('total', 'status')
            ->toArray();

        $monthlyTrends = $this->getMonthlySeries($parishId, 12);

        $counts = array_column($monthlyTrends, 'count');
        $n = count($counts);
        $mean = $n > 0 ? array_sum($counts) / $n : 0;
        $variance = $n > 0
            ? array_sum(array_map(fn ($x) => pow($x - $mean, 2), $counts)) / $n
            : 0;

        $pendingCertificates = CertificateRequest::query()
            ->when($parishId, fn ($q) => $q->whereHas('record', fn ($r) => $r->where('originating_parish_id', $parishId)))
            ->where('status', 'pending')
            ->count();

        return [
            'records_by_type' => $recordsByType,
            'schedule_stats' => $scheduleStats,
            'monthly_trends' => $monthlyTrends,
            'summary' => [
                'total_records' => array_sum($recordsByType),
                'monthly_average' => round($mean, 2),
                'monthly_std_dev' => round(sqrt($variance), 2),
                'pending_certificates' => $pendingCertificates,
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
        if ($totalSchedules > 10 && ($cancelled / $totalSchedules) > 0.15) {
            $cancelRate = round(($cancelled / $totalSchedules) * 100, 1);
            $recommendations[] = [
                'category' => 'Schedule Reliability',
                'priority' => 'medium',
                'title' => "Elevated Cancellation Rate ({$cancelRate}%)",
                'insight' => 'More than 15% of scheduled sacraments are ending in cancellation.',
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

    private function getMonthlySeries(?int $parishId, int $months): array
    {
        $startDate = Carbon::now()->subMonths($months - 1)->startOfMonth();

        // PostgreSQL uses TO_CHAR, SQLite uses strftime, MySQL uses DATE_FORMAT
        $dateFormat = match (DB::getDriverName()) {
            'pgsql' => "TO_CHAR(created_at, 'YYYY-MM')",
            'sqlite' => "strftime('%Y-%m', created_at)",
            default => "DATE_FORMAT(created_at, '%Y-%m')",
        };

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
}
