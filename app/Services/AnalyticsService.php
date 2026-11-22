<?php

namespace App\Services;

use App\Models\CertificateRequest;
use App\Models\Clergy;
use App\Models\SacramentalRecord;
use App\Models\SacramentSchedule;
use App\Models\TransactionLine;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class AnalyticsService
{
    /**
     * Prepares data packages for both tabs with parish and date filters applied.
     */
    public function getFullAnalytics(?int $parishId = null, array $filters = []): array
    {
        return [
            'sacraments' => $this->getSacramentAnalytics($parishId, $filters),
            'finance' => $this->getFinanceAnalytics($parishId, $filters),
        ];
    }

    /**
     * =========================================================================
     * TAB 1: SACRAMENTS ANALYTICS
     * =========================================================================
     */
    public function getSacramentAnalytics(?int $parishId = null, array $filters = []): array
    {
        // 1. Certificate Requests (Pending vs Processed)
        $pendingCertificates = $this->countCertificatesByType($parishId, [
            'pending', 'verified', 'approved', 'awaiting_payment', 'processing', 'ready',
        ], $filters);

        $processedCertificates = $this->countCertificatesByType($parishId, [
            'issued', 'released', 'completed', 'out_for_delivery',
        ], $filters);

        // 2. Sacrament Appointments (Pending vs Completed)
        $pendingAppointments = $this->countSchedulesByType($parishId, [
            'requested', 'on_hold', 'processing', 'scheduled', 'confirmed',
        ], $filters);

        $completedAppointments = $this->countCompletedSacraments($parishId, $filters);

        // 3. Descriptive Historical Metrics
        $descriptive = $this->getDescriptiveMetrics($parishId, $filters);

        // 4. Predictive 3-Month Forecast (using rolling 12-month baseline for linear trend stability)
        $forecastingBaseline = $this->getMonthlySeries($parishId, 12);
        $predictive = $this->getPredictiveForecast($forecastingBaseline, 3);

        // 5. Prescriptive Operational Recommendations
        $prescriptive = $this->getPrescriptiveRecommendations($descriptive, $predictive, $parishId);

        return [
            'certificates' => [
                'pending' => $pendingCertificates,
                'processed' => $processedCertificates,
            ],
            'appointments' => [
                'pending' => $pendingAppointments,
                'completed' => $completedAppointments,
            ],
            'descriptive' => $descriptive,
            'predictive' => $predictive,
            'prescriptive' => $prescriptive,
        ];
    }

    /**
     * Helper to apply day, month, or year filters to any Eloquent / DB query.
     */
    private function applyDateFilter($query, array $filters, string $column): void
    {
        $period = $filters['period'] ?? 'all';
        $year = (int) ($filters['year'] ?? date('Y'));
        $month = $filters['month'] ?? date('Y-m');
        $date = $filters['date'] ?? date('Y-m-d');

        if ($period === 'year') {
            $query->whereYear($column, $year);
        } elseif ($period === 'month') {
            $parts = explode('-', $month);
            $y = (int) ($parts[0] ?? $year);
            $m = (int) ($parts[1] ?? date('m'));
            $query->whereYear($column, $y)->whereMonth($column, $m);
        } elseif ($period === 'day') {
            $query->whereDate($column, $date);
        }
    }

    /**
     * Counts certificate requests by sacrament type (joining sacramental_records).
     */
    private function countCertificatesByType(?int $parishId, array $statuses, array $filters = []): array
    {
        $query = CertificateRequest::query()
            ->join('sacramental_records', 'certificate_requests.record_id', '=', 'sacramental_records.id')
            ->when($parishId, fn ($q) => $q->where('sacramental_records.originating_parish_id', $parishId))
            ->whereIn('certificate_requests.status', $statuses);

        $this->applyDateFilter($query, $filters, 'certificate_requests.created_at');

        $raw = $query
            ->select('sacramental_records.sacrament_type', DB::raw('COUNT(*) as total'))
            ->groupBy('sacramental_records.sacrament_type')
            ->pluck('total', 'sacramental_records.sacrament_type')
            ->toArray();

        $normalized = array_change_key_case($raw, CASE_LOWER);
        $baptism = (int) ($normalized['baptism'] ?? $normalized['binyag'] ?? 0);
        $confirmation = (int) ($normalized['confirmation'] ?? $normalized['kumpil'] ?? 0);

        return [
            'total' => $baptism + $confirmation,
            'baptism' => $baptism,
            'confirmation' => $confirmation,
        ];
    }

    /**
     * Counts scheduled sacrament appointments sorted into canonical buckets.
     */
    private function countSchedulesByType(?int $parishId, array $statuses, array $filters = []): array
    {
        $query = SacramentSchedule::query()
            ->when($parishId, fn ($q) => $q->where('parish_id', $parishId))
            ->whereIn('status', $statuses);

        $this->applyDateFilter($query, $filters, 'starts_at');

        $raw = $query
            ->select('sacrament_type', DB::raw('COUNT(*) as total'))
            ->groupBy('sacrament_type')
            ->pluck('total', 'sacrament_type')
            ->toArray();

        $baptism = 0;
        $confirmation = 0;
        $marriage = 0;
        $funeral = 0;
        $others = 0;

        foreach ($raw as $type => $count) {
            $key = strtolower(trim((string) $type));
            $value = (int) $count;

            match (true) {
                in_array($key, ['baptism', 'binyag']) => $baptism += $value,
                in_array($key, ['confirmation', 'kumpil']) => $confirmation += $value,
                in_array($key, ['marriage', 'wedding', 'kasal']) => $marriage += $value,
                in_array($key, ['funeral', 'death', 'patay']) => $funeral += $value,
                default => $others += $value,
            };
        }

        return [
            'total' => $baptism + $confirmation + $marriage + $funeral + $others,
            'baptism' => $baptism,
            'confirmation' => $confirmation,
            'marriage' => $marriage,
            'funeral' => $funeral,
            'others' => $others,
        ];
    }

    /**
     * Counts completed sacraments from canonical registry records (Baptism, Confirmation,
     * Marriage, Funeral) and completed non-registry liturgical services (Others).
     */
    private function countCompletedSacraments(?int $parishId, array $filters = []): array
    {
        // 1. Inscribed canonical records (Baptism, Confirmation, Marriage, Death/Funeral)
        $recordsQuery = SacramentalRecord::query()
            ->when($parishId, fn ($q) => $q->where('originating_parish_id', $parishId));

        $this->applyDateFilter($recordsQuery, $filters, 'event_date');

        $rawRecords = $recordsQuery
            ->select('sacrament_type', DB::raw('COUNT(*) as total'))
            ->groupBy('sacrament_type')
            ->pluck('total', 'sacrament_type')
            ->toArray();

        $baptism = 0;
        $confirmation = 0;
        $marriage = 0;
        $funeral = 0;

        foreach ($rawRecords as $type => $count) {
            $key = strtolower(trim((string) $type));
            $value = (int) $count;

            match (true) {
                in_array($key, ['baptism', 'binyag']) => $baptism += $value,
                in_array($key, ['confirmation', 'kumpil']) => $confirmation += $value,
                in_array($key, ['marriage', 'wedding', 'kasal']) => $marriage += $value,
                in_array($key, ['death', 'funeral', 'patay']) => $funeral += $value,
                default => null,
            };
        }

        // 2. Completed non-registry services (Blessings, Bone Transfers, Sponsored Masses, etc.)
        $nonRegistryTypes = [
            'blessing',
            'sponsored_mass',
            'bone_transfer',
            'eucharist',
            'anointing',
            'reconciliation',
            'meeting',
            'office_activity',
            'other',
        ];

        $schedulesQuery = SacramentSchedule::query()
            ->when($parishId, fn ($q) => $q->where('parish_id', $parishId))
            ->where('status', 'completed')
            ->where(function ($q) use ($nonRegistryTypes) {
                $q->whereIn('sacrament_type', $nonRegistryTypes)
                    ->orWhere(function ($sub) {
                        $sub->whereNotIn('sacrament_type', [
                            'baptism', 'binyag',
                            'confirmation', 'kumpil',
                            'wedding', 'matrimony', 'marriage', 'kasal',
                            'funeral', 'death', 'patay',
                        ])->whereNull('record_id');
                    });
            });

        $this->applyDateFilter($schedulesQuery, $filters, 'starts_at');
        $others = (int) $schedulesQuery->count();

        return [
            'total' => $baptism + $confirmation + $marriage + $funeral + $others,
            'baptism' => $baptism,
            'confirmation' => $confirmation,
            'marriage' => $marriage,
            'funeral' => $funeral,
            'others' => $others,
        ];
    }

    /**
     * Computes descriptive canonical metrics and statistical dispersion.
     */
    public function getDescriptiveMetrics(?int $parishId = null, array $filters = []): array
    {
        // 1. Records by sacrament type
        $recordsQuery = SacramentalRecord::query()
            ->when($parishId, fn ($q) => $q->where('originating_parish_id', $parishId));
        $this->applyDateFilter($recordsQuery, $filters, 'event_date');

        $recordsByType = $recordsQuery
            ->select('sacrament_type', DB::raw('COUNT(*) as total'))
            ->groupBy('sacrament_type')
            ->pluck('total', 'sacrament_type')
            ->toArray();

        // 2. Schedule statuses
        $scheduleQuery = SacramentSchedule::query()
            ->when($parishId, fn ($q) => $q->where('parish_id', $parishId));
        $this->applyDateFilter($scheduleQuery, $filters, 'starts_at');

        $scheduleStats = $scheduleQuery
            ->select('status', DB::raw('COUNT(*) as total'))
            ->groupBy('status')
            ->pluck('total', 'status')
            ->toArray();

        // 3. Historical monthly series (12 months of year if year filter, else rolling 12 months)
        $monthlyTrends = $this->getMonthlySeries($parishId, 12, $filters);

        $counts = array_column($monthlyTrends, 'count');
        $n = count($counts);
        $mean = $n > 0 ? array_sum($counts) / $n : 0;
        $variance = $n > 0
            ? array_sum(array_map(fn ($x) => pow($x - $mean, 2), $counts)) / $n
            : 0;

        // 4. Pending certificate queue count
        $certQuery = CertificateRequest::query()
            ->when($parishId, fn ($q) => $q->whereHas('record', fn ($r) => $r->where('originating_parish_id', $parishId)))
            ->whereIn('status', ['pending', 'verified', 'approved', 'awaiting_payment', 'processing', 'ready']);
        $this->applyDateFilter($certQuery, $filters, 'created_at');
        $pendingCertificates = $certQuery->count();

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

    /**
     * Ordinary Least Squares linear regression to forecast upcoming demand.
     */
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
                'predicted_count' => (int) $predictedValue,
                'is_forecast' => true,
            ];
        }

        return [
            'slope' => round($slope, 3),
            'trend_direction' => $slope > 0.2 ? 'upward' : ($slope < -0.2 ? 'downward' : 'stable'),
            'forecast' => $forecast,
        ];
    }

    /**
     * Actionable operational recommendations based on metrics.
     */
    public function getPrescriptiveRecommendations(array $descriptive, array $predictive, ?int $parishId = null): array
    {
        $recommendations = [];
        $monthlyAvg = $descriptive['summary']['monthly_average'];

        // 1. Demand Surge Alert
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
                'insight' => "Forecasted volume peaks up to {$increasePct}% above monthly average ({$monthlyAvg}) across: {$monthList}.",
                'action' => 'Open additional weekend sacrament slots and pre-assign assisting clergy.',
            ];
        } else {
            $scheduledCount = $descriptive['schedule_stats']['scheduled'] ?? ($descriptive['schedule_stats']['confirmed'] ?? 0);
            $requestedCount = $descriptive['schedule_stats']['requested'] ?? ($descriptive['schedule_stats']['pending'] ?? 0);

            if ($requestedCount > 0 || $scheduledCount > 0) {
                $recommendations[] = [
                    'category' => 'Scheduling & Capacity',
                    'priority' => 'medium',
                    'title' => 'Active Sacrament Booking Management',
                    'insight' => "Parish booking capacity: {$scheduledCount} confirmed booking(s) and {$requestedCount} pending request(s).",
                    'action' => 'Review pending ceremony reservations and confirm presiding clergy availability.',
                ];
            } else {
                $recommendations[] = [
                    'category' => 'Scheduling & Capacity',
                    'priority' => 'low',
                    'title' => 'Scheduling Capacity Stable',
                    'insight' => 'No critical appointment backlogs identified.',
                    'action' => 'Maintain current calendar slot distribution.',
                ];
            }
        }

        // 2. Dominant Sacrament Focus
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
                    'insight' => "{$formattedName} accounts for {$topCount} out of {$totalRecords} total records.",
                    'action' => "Pre-prepare {$formattedName} certificates and schedule priority seminars.",
                ];
            }
        }

        // 3. Certificate Queue Bottleneck
        $pendingCerts = $descriptive['summary']['pending_certificates'];
        if ($pendingCerts >= 15) {
            $recommendations[] = [
                'category' => 'Document Processing',
                'priority' => 'medium',
                'title' => "Certificate Backlog Alert ({$pendingCerts} Pending)",
                'insight' => 'Pending certificate requests have crossed the 15-request threshold.',
                'action' => 'Schedule a dedicated verification and printing window.',
            ];
        }

        // 4. Clergy Workload Balancing
        $activeClergyCount = Clergy::query()
            ->when($parishId, fn ($q) => $q->whereHas('assignments', fn ($a) => $a->where('parish_id', $parishId)))
            ->count();

        if ($activeClergyCount > 0 && ($monthlyAvg / $activeClergyCount) > 25) {
            $recommendations[] = [
                'category' => 'Clergy Allocation',
                'priority' => 'high',
                'title' => 'High Clergy-to-Sacrament Ratio',
                'insight' => 'Average monthly sacraments per active clergy member exceeds 25 ceremonies.',
                'action' => 'Request visiting clergy support for peak weekends.',
            ];
        }

        // Default status
        if (empty($recommendations)) {
            $recommendations[] = [
                'category' => 'System Status',
                'priority' => 'low',
                'title' => 'Optimal Parish Operations',
                'insight' => 'Sacrament demand, clergy ratios, and certificate queues are within normal thresholds.',
                'action' => 'Maintain current scheduling intervals and standard staff rotation.',
            ];
        }

        return $recommendations;
    }

    /**
     * Builds time-series monthly trend counts for sacramental records.
     */
    private function getMonthlySeries(?int $parishId, int $months, array $filters = []): array
    {
        $dateFormat = match (DB::getDriverName()) {
            'pgsql' => "TO_CHAR(created_at, 'YYYY-MM')",
            'sqlite' => "strftime('%Y-%m', created_at)",
            default => "DATE_FORMAT(created_at, '%Y-%m')",
        };

        $isYearFilter = ($filters['period'] ?? 'all') === 'year';
        $year = (int) ($filters['year'] ?? date('Y'));

        if ($isYearFilter) {
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

    /**
     * =========================================================================
     * TAB 2: FINANCE ANALYTICS
     * =========================================================================
     */
    public function getFinanceAnalytics(?int $parishId = null, array $filters = [], int $months = 6): array
    {
        // 1. Total Cash In (Official Receipts) with date filter
        $inQuery = TransactionLine::query()
            ->join('transactions', 'transaction_lines.transaction_id', '=', 'transactions.id')
            ->when($parishId, fn ($q) => $q->where('transactions.parish_id', $parishId))
            ->where('transactions.type', 'receipt');
        $this->applyDateFilter($inQuery, $filters, 'transactions.transaction_date');
        $totalCashIn = (float) $inQuery->sum('transaction_lines.credit_amount');

        // 2. Total Cash Out (Check Vouchers) with date filter
        $outQuery = TransactionLine::query()
            ->join('transactions', 'transaction_lines.transaction_id', '=', 'transactions.id')
            ->when($parishId, fn ($q) => $q->where('transactions.parish_id', $parishId))
            ->where('transactions.type', 'check');
        $this->applyDateFilter($outQuery, $filters, 'transactions.transaction_date');
        $totalCashOut = (float) $outQuery->sum('transaction_lines.debit_amount');

        // 3. Net Total
        $netTotal = round($totalCashIn - $totalCashOut, 2);

        // 4. Chart of Accounts Breakdown
        $inflowByAccount = $this->getAccountCodeBreakdown($parishId, 'receipt', $filters);
        $outflowByAccount = $this->getAccountCodeBreakdown($parishId, 'check', $filters);

        // 5. Monthly Cash Flow Series
        $monthlyCashflow = $this->getMonthlyCashflowSeries($parishId, $filters, $months);

        return [
            'summary' => [
                'total_cash_in' => round($totalCashIn, 2),
                'total_cash_out' => round($totalCashOut, 2),
                'net_total' => $netTotal,
                'is_surplus' => $netTotal >= 0,
            ],
            'inflow_by_account' => $inflowByAccount,
            'outflow_by_account' => $outflowByAccount,
            'monthly_cashflow' => $monthlyCashflow,
        ];
    }

    /**
     * Account code breakdown for receipts (credit_amount) or checks (debit_amount).
     */
    private function getAccountCodeBreakdown(?int $parishId, string $transactionType, array $filters = []): array
    {
        $amountColumn = $transactionType === 'receipt' ? 'credit_amount' : 'debit_amount';

        $query = TransactionLine::query()
            ->join('transactions', 'transaction_lines.transaction_id', '=', 'transactions.id')
            ->join('chart_of_accounts', 'transaction_lines.chart_of_account_id', '=', 'chart_of_accounts.id')
            ->when($parishId, fn ($q) => $q->where('transactions.parish_id', $parishId))
            ->where('transactions.type', $transactionType)
            ->where("transaction_lines.{$amountColumn}", '>', 0);

        $this->applyDateFilter($query, $filters, 'transactions.transaction_date');

        return $query
            ->select(
                'chart_of_accounts.code as account_code',
                'chart_of_accounts.title as account_name',
                DB::raw("SUM(transaction_lines.{$amountColumn}) as total_amount"),
                DB::raw('COUNT(transaction_lines.id) as entry_count')
            )
            ->groupBy('chart_of_accounts.code', 'chart_of_accounts.title')
            ->orderByDesc('total_amount')
            ->get()
            ->map(fn ($row) => [
                'account_code' => $row->account_code,
                'account_name' => $row->account_name,
                'label' => "{$row->account_code} - {$row->account_name}",
                'total' => round((float) $row->total_amount, 2),
                'entry_count' => (int) $row->entry_count,
            ])
            ->toArray();
    }

    /**
     * Builds cashflow series (cash_in and cash_out by month).
     */
    private function getMonthlyCashflowSeries(?int $parishId, array $filters = [], int $months = 6): array
    {
        $dateFormat = match (DB::getDriverName()) {
            'pgsql' => "TO_CHAR(transactions.transaction_date, 'YYYY-MM')",
            'sqlite' => "strftime('%Y-%m', transactions.transaction_date)",
            default => "DATE_FORMAT(transactions.transaction_date, '%Y-%m')",
        };

        $isYearFilter = ($filters['period'] ?? 'all') === 'year';
        $year = (int) ($filters['year'] ?? date('Y'));

        if ($isYearFilter) {
            $monthsToGenerate = [];
            for ($m = 1; $m <= 12; $m++) {
                $monthsToGenerate[] = sprintf('%04d-%02d', $year, $m);
            }
            $startDate = Carbon::createFromDate($year, 1, 1)->startOfDay();
            $endDate = Carbon::createFromDate($year, 12, 31)->endOfDay();
        } else {
            $startDate = Carbon::now()->subMonths($months - 1)->startOfMonth();
            $endDate = Carbon::now()->endOfMonth();
            $monthsToGenerate = [];
            for ($i = 0; $i < $months; $i++) {
                $monthsToGenerate[] = $startDate->copy()->addMonths($i)->format('Y-m');
            }
        }

        $inRows = TransactionLine::query()
            ->join('transactions', 'transaction_lines.transaction_id', '=', 'transactions.id')
            ->when($parishId, fn ($q) => $q->where('transactions.parish_id', $parishId))
            ->where('transactions.type', 'receipt')
            ->whereBetween('transactions.transaction_date', [$startDate, $endDate])
            ->select(DB::raw("$dateFormat as month"), DB::raw('SUM(transaction_lines.credit_amount) as total'))
            ->groupBy('month')
            ->pluck('total', 'month')
            ->toArray();

        $outRows = TransactionLine::query()
            ->join('transactions', 'transaction_lines.transaction_id', '=', 'transactions.id')
            ->when($parishId, fn ($q) => $q->where('transactions.parish_id', $parishId))
            ->where('transactions.type', 'check')
            ->whereBetween('transactions.transaction_date', [$startDate, $endDate])
            ->select(DB::raw("$dateFormat as month"), DB::raw('SUM(transaction_lines.debit_amount) as total'))
            ->groupBy('month')
            ->pluck('total', 'month')
            ->toArray();

        $series = [];
        foreach ($monthsToGenerate as $mKey) {
            $series[] = [
                'month' => $mKey,
                'cash_in' => round((float) ($inRows[$mKey] ?? 0), 2),
                'cash_out' => round((float) ($outRows[$mKey] ?? 0), 2),
            ];
        }

        return $series;
    }
}
