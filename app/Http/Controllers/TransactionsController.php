<?php

namespace App\Http\Controllers;

use App\Enums\AuditActionEnum;
use App\Models\ChartOfAccount;
use App\Models\Parish;
use App\Models\Transaction;
use App\Models\TransactionLine;
use App\Services\AuditService;
use App\Services\ParishScopingService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class TransactionsController extends Controller
{
    /**
     * Display the Parish Unified Financial Ledger for Reference & Cross-Checking.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();

        // Multi-tenant parish scoping
        $scopedParish = ParishScopingService::visibleParish($user);
        $parishId = $scopedParish?->id ?? $user->home_parish_id;

        $search = trim((string) $request->query('search', ''));
        $type = (string) $request->query('type', 'all');

        $query = Transaction::query()
            ->with(['lines.account', 'preparer', 'parish'])
            ->withSum('lines as total_amount', 'debit_amount')
            ->when(! $user->isArchdioceseWide() && $parishId, function ($q) use ($parishId) {
                $q->where('parish_id', $parishId);
            });

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('reference_no', 'like', "%{$search}%")
                    ->orWhere('contact_name', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        if ($type !== 'all') {
            $query->where('type', $type);
        }

        $transactions = $query->orderByDesc('transaction_date')
            ->orderByDesc('id')
            ->paginate(20)
            ->withQueryString();

        // Chart of Accounts for Official Receipt form and filtering
        $accounts = ChartOfAccount::where('is_active', true)
            ->orderBy('code')
            ->get(['id', 'code', 'title', 'type', 'default_amount', 'is_active']);

        // Generate suggested next OR number (OR-YYYY-XXXX)
        $year = date('Y');
        $prefixOr = "OR-{$year}-";
        $latestOr = Transaction::where('reference_no', 'like', "{$prefixOr}%")
            ->orderByDesc('id')
            ->value('reference_no');

        $nextOrSeq = 1;
        if ($latestOr && preg_match('/-(\d+)$/', $latestOr, $matches)) {
            $nextOrSeq = (int) $matches[1] + 1;
        }
        $suggestedOr = sprintf('%s%04d', $prefixOr, $nextOrSeq);

        // Generate suggested next CV number (CV-YYYY-XXXX)
        $prefixCv = "CV-{$year}-";
        $latestCv = Transaction::where('reference_no', 'like', "{$prefixCv}%")
            ->orderByDesc('id')
            ->value('reference_no');

        $nextCvSeq = 1;
        if ($latestCv && preg_match('/-(\d+)$/', $latestCv, $matches)) {
            $nextCvSeq = (int) $matches[1] + 1;
        }
        $suggestedCv = sprintf('%s%04d', $prefixCv, $nextCvSeq);

        // Headline financial KPIs for reference & cross-checking
        $kpiQuery = Transaction::query()
            ->when(! $user->isArchdioceseWide() && $parishId, fn ($q) => $q->where('parish_id', $parishId));

        $totalReceipts = (clone $kpiQuery)
            ->where('type', 'receipt')
            ->with('lines')
            ->get()
            ->sum(fn ($t) => $t->totalCredit());

        $totalExpenses = (clone $kpiQuery)
            ->where('type', 'check')
            ->with('lines')
            ->get()
            ->sum(fn ($t) => $t->totalCredit());

        $totalTransactionsCount = (clone $kpiQuery)->count();
        $totalReceiptsCount = (clone $kpiQuery)->where('type', 'receipt')->count();
        $totalChecksCount = (clone $kpiQuery)->where('type', 'check')->count();

        $thisMonthInflows = (clone $kpiQuery)
            ->where('type', 'receipt')
            ->whereMonth('transaction_date', date('m'))
            ->whereYear('transaction_date', date('Y'))
            ->with('lines')
            ->get()
            ->sum(fn ($t) => $t->totalCredit());

        $thisMonthOutflows = (clone $kpiQuery)
            ->where('type', 'check')
            ->whereMonth('transaction_date', date('m'))
            ->whereYear('transaction_date', date('Y'))
            ->with('lines')
            ->get()
            ->sum(fn ($t) => $t->totalCredit());

        $netCashFlow = $totalReceipts - $totalExpenses;

        return Inertia::render('Ledger/Index', [
            'transactions' => $transactions,
            'accounts' => $accounts,
            'suggestedOr' => $suggestedOr,
            'suggestedCv' => $suggestedCv,
            'filters' => [
                'search' => $search,
                'type' => $type,
            ],
            'kpis' => [
                'totalReceipts' => (float) $totalReceipts,
                'totalExpenses' => (float) $totalExpenses,
                'totalTransactions' => $totalTransactionsCount,
                'totalReceiptsCount' => $totalReceiptsCount,
                'totalChecksCount' => $totalChecksCount,
                'thisMonthInflows' => (float) $thisMonthInflows,
                'thisMonthOutflows' => (float) $thisMonthOutflows,
                'netCashFlow' => (float) $netCashFlow,
            ],
            'currentParish' => $scopedParish ?? ($parishId ? Parish::find($parishId) : null),
        ]);
    }

    /**
     * Store a new immutable double-entry transaction (Official Receipt).
     * Once recorded, the transaction appears immediately in the records for cross-checking.
     */
    public function store(Request $request): RedirectResponse
    {
        // 1. Basic Validation
        $validated = $request->validate([
            'reference_no' => 'required|string|max:80|unique:transactions,reference_no',
            'transaction_date' => 'required|date',
            'contact_name' => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
            'type' => 'required|in:receipt,check,deposit',
            'lines.credits' => 'required|array|min:1',
            'lines.debits' => 'required|array|min:1',
            'lines.credits.*.amount' => 'required|numeric|min:0.01',
            'lines.debits.*.amount' => 'required|numeric|min:0.01',
        ]);

        // Flexible support for either account_id or chart_of_account_id
        foreach (['credits', 'debits'] as $side) {
            foreach ($request->input("lines.{$side}", []) as $index => $line) {
                $accountId = $line['account_id'] ?? $line['chart_of_account_id'] ?? null;
                if (! $accountId || ! ChartOfAccount::where('id', $accountId)->exists()) {
                    throw ValidationException::withMessages([
                        "lines.{$side}.{$index}.account_id" => 'A valid Chart of Account must be selected.',
                    ]);
                }
            }
        }

        // 2. Strict Server-Side Balancing Check (Double-entry equality)
        $totalCredits = collect($request->input('lines.credits'))->sum('amount');
        $totalDebits = collect($request->input('lines.debits'))->sum('amount');

        // Use a small epsilon (0.001) for floating-point comparison safety
        if (abs($totalCredits - $totalDebits) > 0.001) {
            throw ValidationException::withMessages([
                'balance' => 'Transaction rejected: Total Credits and Total Debits do not match.',
            ]);
        }

        // Multi-tenant Parish determination
        $user = $request->user();
        $parishId = $user->home_parish_id ?? Parish::where('is_active', true)->value('id');

        // 3. Database Transaction (Atomic, Immutable Record)
        $transaction = DB::transaction(function () use ($validated, $request, $user, $parishId) {
            // Create the Immutable Header - automatically marked as recorded ('posted')
            $txn = Transaction::create([
                'parish_id' => $parishId,
                'reference_no' => $validated['reference_no'],
                'transaction_date' => $validated['transaction_date'],
                'type' => $validated['type'],
                'contact_name' => $validated['contact_name'],
                'description' => $validated['description'] ?? null,
                'status' => 'posted',
                'prepared_by' => $user->id,
            ]);

            // Save Credit Lines (Revenues / Inflow)
            foreach ($request->input('lines.credits') as $line) {
                $accountId = $line['account_id'] ?? $line['chart_of_account_id'];
                $txn->lines()->create([
                    'chart_of_account_id' => $accountId,
                    'credit_amount' => $line['amount'],
                    'debit_amount' => 0,
                    'notes' => $line['notes'] ?? null,
                ]);
            }

            // Save Debit Lines (Assets / Bank / Cash)
            foreach ($request->input('lines.debits') as $line) {
                $accountId = $line['account_id'] ?? $line['chart_of_account_id'];
                $txn->lines()->create([
                    'chart_of_account_id' => $accountId,
                    'debit_amount' => $line['amount'],
                    'credit_amount' => 0,
                    'notes' => $line['notes'] ?? null,
                ]);
            }

            return $txn;
        });

        // Audit Trail Compliance (RA 10173 & Archdiocesan Financial Controls)
        $isCheck = ($validated['type'] === 'check');
        $typeLabel = $isCheck ? 'Check Voucher' : ($validated['type'] === 'deposit' ? 'Deposit' : 'Official Receipt');
        $directionLabel = $isCheck ? 'to payee' : 'from';

        AuditService::log(
            $request,
            AuditActionEnum::CREATE,
            'transaction',
            $transaction->id,
            "Transcribed immutable {$typeLabel} {$transaction->reference_no} amounting to ₱".number_format($totalCredits, 2)." {$directionLabel} {$transaction->contact_name}"
        );

        // 4. Return to the Ledger Dashboard
        return redirect()->route('ledger.index')
            ->with('success', "{$typeLabel} {$transaction->reference_no} recorded successfully. Entry is now inscribed in the parish ledger.");
    }
}
