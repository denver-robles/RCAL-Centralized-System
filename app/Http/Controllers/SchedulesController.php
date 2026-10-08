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
            'starts_at' => ['nullable', 'date'],
            'ends_at' => ['nullable', 'date', 'after:starts_at'],
            'presiding_clergy_id' => ['nullable', 'integer', 'exists:clergy,id'],
            'guest_priest_name' => ['nullable', 'string', 'max:255'],
        ]);

        $user = $request->user();
        if (!$user->isArchdioceseWide() && (int) $user->home_parish_id !== (int) $schedule->parish_id) {
            abort(403, 'Access denied.');
        }

        $oldStatus = $schedule->status;
        $newStatus = ScheduleStatusEnum::from($validated['status']);

        $updateData = [
            'status' => $newStatus,
            'cancellation_reason' => $newStatus === ScheduleStatusEnum::CANCELLED ? ($validated['cancellation_reason'] ?? 'Cancelled by staff') : null,
        ];

        if ($request->filled('starts_at')) {
            $updateData['starts_at'] = $validated['starts_at'];
        }
        if ($request->filled('ends_at')) {
            $updateData['ends_at'] = $validated['ends_at'];
        }
        if ($request->filled('presiding_clergy_id')) {
            $updateData['presiding_clergy_id'] = $validated['presiding_clergy_id'];
        }

        if ($request->filled('guest_priest_name')) {
            $specificData = $schedule->specific_data ?? [];
            $specificData['guest_priest_name'] = $validated['guest_priest_name'];
            $updateData['specific_data'] = $specificData;
            $updateData['presiding_clergy_id'] = null; // Unset clergy ID if guest is used
        }

        $schedule->update($updateData);

        if ($newStatus === ScheduleStatusEnum::COMPLETED && $schedule->record_id === null) {
            // Auto-transcribe to sacramental_records
            $fullName = $schedule->specific_data['child_name'] ?? $schedule->requester_name ?? 'Unknown';
            $nameParts = explode(' ', trim($fullName));
            $firstName = array_shift($nameParts);
            $lastName = count($nameParts) > 0 ? implode(' ', $nameParts) : 'Unknown';

            $person = \App\Models\Person::firstOrCreate(
                [
                    'first_name' => $firstName,
                    'last_name' => $lastName,
                ],
                [
                    'sex' => 'Unknown',
                    'date_of_birth' => $schedule->specific_data['dob'] ?? null,
                    'place_of_birth' => $schedule->specific_data['place_of_birth'] ?? null,
                    'mother_name' => $schedule->specific_data['mother_name'] ?? null,
                    'father_name' => $schedule->specific_data['father_name'] ?? null,
                ]
            );

            // Fetch latest book/page to auto-increment for the parish
            $lastRecord = \App\Models\SacramentalRecord::where('originating_parish_id', $schedule->parish_id)
                ->where('sacrament_type', $schedule->sacrament_type->value ?? $schedule->sacrament_type)
                ->orderByDesc('id')
                ->first();
            
            $book = $lastRecord ? $lastRecord->book_number : 1;
            $page = $lastRecord ? $lastRecord->page_number : 1;
            $entry = $lastRecord ? $lastRecord->entry_number + 1 : 1;

            if ($entry > 50) { // simple pagination logic
                $page++;
                $entry = 1;
            }

            $record = \App\Models\SacramentalRecord::create([
                'person_id' => $person->id,
                'sacrament_type' => $schedule->sacrament_type,
                'event_date' => $schedule->starts_at->toDateString(),
                'originating_parish_id' => $schedule->parish_id,
                'performed_by_clergy_id' => $schedule->presiding_clergy_id,
                'book_number' => $book,
                'page_number' => $page,
                'entry_number' => $entry,
                'godparents' => $schedule->specific_data['godparents'] ?? null,
                'status' => 'registered',
            ]);

            $schedule->update(['record_id' => $record->id]);
        }

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

    /**
     * Show sacrament availability settings.
     */
    public function settings(Request $request): Response
    {
        $user = $request->user();
        $parishId = $user->home_parish_id;

        $settings = \App\Models\SacramentSetting::where('parish_id', $parishId)->get();

        return Inertia::render('Schedules/Settings', [
            'settings' => $settings,
        ]);
    }

    /**
     * Store sacrament availability settings.
     */
    public function storeSettings(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'settings' => ['required', 'array'],
            'settings.*.sacrament_type' => ['required', 'string'],
            'settings.*.is_available' => ['required', 'boolean'],
            'settings.*.time_slots' => ['nullable', 'array'],
        ]);

        $user = $request->user();
        $parishId = $user->home_parish_id;

        foreach ($validated['settings'] as $settingData) {
            \App\Models\SacramentSetting::updateOrCreate(
                ['parish_id' => $parishId, 'sacrament_type' => $settingData['sacrament_type']],
                [
                    'is_available' => $settingData['is_available'],
                    'time_slots' => $settingData['time_slots'] ?? ["08:00-09:00", "09:00-10:00", "10:00-11:00", "11:00-12:00"]
                ]
            );
        }

        return redirect()->back()->with('success', 'Sacrament settings updated successfully.');
    }
}
