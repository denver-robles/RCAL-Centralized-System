<?php

namespace App\Http\Controllers;

use App\Enums\AuditActionEnum;
use App\Enums\ScheduleStatusEnum;
use App\Models\Clergy;
use App\Models\Parish;
use App\Models\SacramentSchedule;
use App\Models\Venue;
use App\Services\AuditService;
use App\Services\ParishScopingService;
use App\Services\SacramentScheduleService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SchedulesController extends Controller
{
    public function __construct(
        protected SacramentScheduleService $scheduleService
    ) {}

    /**
     * Display parish sacrament appointments calendar and schedule table.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();

        $query = SacramentSchedule::query()
            ->with(['parish', 'venue', 'presidingClergy', 'record']);

        ParishScopingService::scopeParish($query, $user, 'parish_id');

        if ($request->filled('status') && $request->query('status') !== 'all') {
            $query->where('status', $request->query('status'));
        }

        if ($request->filled('sacrament_type') && $request->query('sacrament_type') !== 'all') {
            $query->where('sacrament_type', $request->query('sacrament_type'));
        }

        if ($request->filled('date')) {
            $query->whereDate('starts_at', $request->query('date'));
        }

        $schedules = $query->orderBy('starts_at')->paginate(20)->withQueryString();

        $parishId = $user->home_parish_id;
        $venues = $parishId
            ? Venue::where('parish_id', $parishId)->where('is_active', true)->get()
            : Venue::where('is_active', true)->get();

        $clergy = Clergy::where('is_active', true)->orderBy('last_name')->get();

        return Inertia::render('Schedules/Index', [
            'schedules' => $schedules,
            'venues' => $venues,
            'clergy' => $clergy,
            'filters' => $request->only(['status', 'sacrament_type', 'date']),
        ]);
    }

    /**
     * Show scheduling form for sacraments.
     */
    public function create(Request $request): Response
    {
        $user = $request->user();

        $parishes = $user->isArchdioceseWide()
            ? Parish::where('is_active', true)->orderBy('name')->get()
            : Parish::where('id', $user->home_parish_id)->get();

        $parishId = $user->home_parish_id;
        $venues = $parishId
            ? Venue::where('parish_id', $parishId)->where('is_active', true)->get()
            : Venue::where('is_active', true)->get();

        $clergy = Clergy::where('is_active', true)->orderBy('last_name')->get();

        return Inertia::render('Schedules/Create', [
            'parishes' => $parishes,
            'venues' => $venues,
            'clergy' => $clergy,
        ]);
    }

    /**
     * Real-time conflict inspection endpoint.
     */
    public function checkConflict(Request $request): JsonResponse
    {
        $startsAt = $request->query('starts_at');
        $endsAt = $request->query('ends_at');
        $parishId = (int) $request->query('parish_id');
        $venueId = $request->query('venue_id') ? (int) $request->query('venue_id') : null;
        $clergyId = $request->query('clergy_id') ? (int) $request->query('clergy_id') : null;
        $excludeId = $request->query('exclude_id') ? (int) $request->query('exclude_id') : null;

        if (!$startsAt || !$endsAt || !$parishId) {
            return response()->json(['has_conflict' => false]);
        }

        try {
            $conflicts = $this->scheduleService->detectConflicts(
                Carbon::parse($startsAt),
                Carbon::parse($endsAt),
                $parishId,
                $venueId,
                $clergyId,
                $excludeId
            );

            if ($conflicts->isNotEmpty()) {
                $description = $this->scheduleService->describeConflict(
                    $conflicts->first(),
                    $venueId,
                    $clergyId
                );

                return response()->json([
                    'has_conflict' => true,
                    'message' => $description,
                    'conflicts' => $conflicts->map(fn ($c) => [
                        'id' => $c->id,
                        'title' => $c->title,
                        'starts_at' => $c->starts_at->toIso8601String(),
                        'ends_at' => $c->ends_at->toIso8601String(),
                    ]),
                ]);
            }

            return response()->json(['has_conflict' => false]);
        } catch (\Throwable $e) {
            return response()->json(['has_conflict' => false, 'error' => $e->getMessage()]);
        }
    }

    /**
     * Store a new sacrament schedule.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'parish_id' => ['required', 'integer', 'exists:parishes,id'],
            'venue_id' => ['nullable', 'integer', 'exists:venues,id'],
            'presiding_clergy_id' => ['nullable', 'integer', 'exists:clergy,id'],
            'sacrament_type' => ['required', 'string', 'in:baptism,confirmation,wedding,funeral,blessing,eucharist,anointing,reconciliation,meeting,office_activity,other'],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'starts_at' => ['required', 'date', 'after_or_equal:today'],
            'ends_at' => ['required', 'date', 'after:starts_at'],
            'requester_name' => ['nullable', 'string', 'max:255'],
            'requester_contact' => ['nullable', 'string', 'regex:/^[0-9]{7}$/'],
            'expected_attendees' => ['nullable', 'integer', 'min:1'],
        ], [
            'starts_at.after_or_equal' => 'Sacrament schedule date cannot be scheduled in the past.',
            'requester_contact.regex' => 'Contact number must be exactly 7 digits (e.g., 7562572).',
        ]);

        $schedule = $this->scheduleService->bookSacrament($validated, $request->user());

        AuditService::record(
            AuditActionEnum::CREATE,
            $schedule,
            null,
            $schedule->toArray(),
            "Sacrament scheduled: {$schedule->title}",
            $request->user()
        );

        return redirect()->route('schedules.index')
            ->with('success', "Sacrament appointment '{$schedule->title}' confirmed and booked.");
    }

    /**
     * Update schedule status (confirmed, completed, cancelled).
     */
    public function updateStatus(Request $request, SacramentSchedule $schedule): RedirectResponse
    {
        $validated = $request->validate([
            'status' => ['required', 'string', 'in:confirmed,completed,cancelled'],
            'cancellation_reason' => ['nullable', 'string', 'max:500'],
        ]);

        $user = $request->user();
        if (!$user->isArchdioceseWide() && (int) $user->home_parish_id !== (int) $schedule->parish_id) {
            abort(403, 'Access denied.');
        }

        $oldStatus = $schedule->status;
        $newStatus = ScheduleStatusEnum::from($validated['status']);

        $schedule->update([
            'status' => $newStatus,
            'cancellation_reason' => $newStatus === ScheduleStatusEnum::CANCELLED ? ($validated['cancellation_reason'] ?? 'Cancelled by staff') : null,
        ]);

        AuditService::record(
            AuditActionEnum::STATUS_CHANGE,
            $schedule,
            ['status' => $oldStatus->value],
            ['status' => $newStatus->value],
            "Schedule #{$schedule->id} updated to {$newStatus->value}",
            $user
        );

        return redirect()->back()->with('success', "Schedule status updated to {$newStatus->value}.");
    }
}
