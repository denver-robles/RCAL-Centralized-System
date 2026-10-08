<?php

namespace App\Http\Controllers;

use App\Models\AccessLog;
use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AuditController extends Controller
{
    /**
     * Display Chancery Curia audit logs and RA 10173 access trail.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();

        if (!$user->isArchdioceseWide()) {
            abort(403, 'Archdiocesan Curia audit logs are reserved for Chancery and System Administrators.');
        }

        $tab = $request->query('tab', 'audit');
        $search = trim((string) $request->query('search', ''));
        $action = $request->query('action', 'all');

        $auditQuery = AuditLog::query()->with('user');
        if ($action !== 'all') {
            $auditQuery->where('action', $action);
        }
        if ($search) {
            $auditQuery->where(function ($q) use ($search) {
                $q->where('note', 'like', "%{$search}%")
                  ->orWhere('subject_type', 'like', "%{$search}%")
                  ->orWhere('actor_username', 'like', "%{$search}%")
                  ->orWhere('ip_address', 'like', "%{$search}%");
            });
        }
        $auditLogs = $auditQuery->orderByDesc('created_at')->paginate(25, ['*'], 'audit_page')->withQueryString();

        $accessQuery = AccessLog::query()->with('user');
        if ($search) {
            $accessQuery->where(function ($q) use ($search) {
                $q->where('resource_identifier', 'like', "%{$search}%")
                  ->orWhere('ip_address', 'like', "%{$search}%");
            });
        }
        $accessLogs = $accessQuery->orderByDesc('accessed_at')->paginate(25, ['*'], 'access_page')->withQueryString();

        return Inertia::render('Audit/Index', [
            'auditLogs' => $auditLogs,
            'accessLogs' => $accessLogs,
            'filters' => [
                'tab' => $tab,
                'action' => $action,
                'search' => $search,
            ],
        ]);
    }

    /**
     * Manually execute the 30-day retention policy to prune older audit logs.
     */
    public function prune(Request $request): \Illuminate\Http\RedirectResponse
    {
        $user = $request->user();

        if (!$user->isArchdioceseWide()) {
            abort(403, 'Unauthorized.');
        }

        $cutoff = now()->subDays(30);
        $count = AuditLog::where('created_at', '<', $cutoff)->delete();

        \App\Services\AuditService::log(
            $request,
            \App\Enums\AuditActionEnum::DELETE,
            'audit_logs',
            null,
            "Chancery Administrator {$user->username} executed 30-day retention purge, removing {$count} audit entries."
        );

        return redirect()->route('audit.index')
            ->with('success', "Retention policy executed: {$count} audit log entries older than 30 days were permanently pruned.");
    }
}
