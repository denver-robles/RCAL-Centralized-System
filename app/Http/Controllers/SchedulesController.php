<?php

namespace App\Http\Controllers;

use App\Enums\AuditActionEnum;
use App\Enums\LegitimacyStatusEnum;
use App\Enums\SacramentTypeEnum;
use App\Enums\ScheduleStatusEnum;
use App\Models\Clergy;
use App\Models\Parish;
use App\Models\Person;
use App\Models\SacramentalRecord;
use App\Models\SacramentSchedule;
use App\Models\SacramentSetting;
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
            ->with(['parish', 'venue', 'presidingClergy', 'requestedClergy', 'record', 'attachments', 'requesterUser']);

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
     * Display interactive calendar view of scheduled and completed sacraments.
     */
    public function calendar(Request $request): Response
    {
        $user = $request->user();

        $year = $request->integer('year', (int) now()->year);
        $month = $request->integer('month', (int) now()->month);

        if ($month < 1 || $month > 12) {
            $month = (int) now()->month;
        }
        if ($year < 1900 || $year > 2100) {
            $year = (int) now()->year;
        }

        $currentDate = Carbon::createFromDate($year, $month, 1);
        $startGrid = $currentDate->copy()->startOfMonth()->startOfWeek(Carbon::SUNDAY)->startOfDay();
        $endGrid = $currentDate->copy()->endOfMonth()->endOfWeek(Carbon::SATURDAY)->endOfDay();

        $query = SacramentSchedule::query()
            ->with([
                'parish',
                'venue',
                'presidingClergy',
                'requestedClergy',
                'record',
                'attachments',
                'requesterUser',
            ])
            ->whereIn('status', [
                ScheduleStatusEnum::SCHEDULED,
                ScheduleStatusEnum::CONFIRMED,
                ScheduleStatusEnum::COMPLETED,
            ])
            ->whereNotNull('starts_at')
            ->whereBetween('starts_at', [$startGrid, $endGrid]);

        ParishScopingService::scopeParish($query, $user, 'parish_id');

        if ($request->filled('parish_id') && $request->query('parish_id') !== 'all') {
            $query->where('parish_id', $request->query('parish_id'));
        }

        if ($request->filled('sacrament_type') && $request->query('sacrament_type') !== 'all') {
            $query->where('sacrament_type', $request->query('sacrament_type'));
        }

        if ($request->filled('status') && $request->query('status') !== 'all') {
            if ($request->query('status') === 'scheduled') {
                $query->whereIn('status', [ScheduleStatusEnum::SCHEDULED, ScheduleStatusEnum::CONFIRMED]);
            } elseif ($request->query('status') === 'completed') {
                $query->where('status', ScheduleStatusEnum::COMPLETED);
            }
        }

        $schedules = $query->orderBy('starts_at', 'asc')->get();

        $monthStart = $currentDate->copy()->startOfMonth()->startOfDay();
        $monthEnd = $currentDate->copy()->endOfMonth()->endOfDay();

        $monthQuery = SacramentSchedule::query()
            ->whereIn('status', [
                ScheduleStatusEnum::SCHEDULED,
                ScheduleStatusEnum::CONFIRMED,
                ScheduleStatusEnum::COMPLETED,
            ])
            ->whereNotNull('starts_at')
            ->whereBetween('starts_at', [$monthStart, $monthEnd]);

        ParishScopingService::scopeParish($monthQuery, $user, 'parish_id');

        if ($request->filled('parish_id') && $request->query('parish_id') !== 'all') {
            $monthQuery->where('parish_id', $request->query('parish_id'));
        }

        $scheduledCount = (clone $monthQuery)
            ->whereIn('status', [ScheduleStatusEnum::SCHEDULED, ScheduleStatusEnum::CONFIRMED])
            ->count();

        $completedCount = (clone $monthQuery)
            ->where('status', ScheduleStatusEnum::COMPLETED)
            ->count();

        $parishes = $user->isArchdioceseWide()
            ? Parish::where('is_active', true)->orderBy('name')->get()
            : Parish::where('id', $user->home_parish_id)->get();

        return Inertia::render('Schedules/Calendar', [
            'schedules' => $schedules,
            'parishes' => $parishes,
            'filters' => [
                'year' => $year,
                'month' => $month,
                'parish_id' => $request->query('parish_id', ''),
                'sacrament_type' => $request->query('sacrament_type', 'all'),
                'status' => $request->query('status', 'all'),
            ],
            'metrics' => [
                'scheduled_count' => $scheduledCount,
                'completed_count' => $completedCount,
                'total_count' => $scheduledCount + $completedCount,
            ],
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

        if (! $startsAt || ! $endsAt || ! $parishId) {
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
            'sacrament_type' => ['required', 'string', 'in:baptism,confirmation,wedding,matrimony,funeral,blessing,sponsored_mass,bone_transfer,eucharist,anointing,reconciliation,meeting,office_activity,other'],
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
     * Update schedule status (on_hold, processing, scheduled, confirmed, completed, cancelled).
     */
    public function updateStatus(Request $request, SacramentSchedule $schedule): RedirectResponse
    {
        if ($request->input('presiding_clergy_id') === 'guest' || ($request->has('presiding_clergy_id') && ! is_numeric($request->input('presiding_clergy_id')))) {
            $request->merge(['presiding_clergy_id' => null]);
        }

        $validated = $request->validate([
            'status' => ['required', 'string', 'in:on_hold,processing,scheduled,confirmed,completed,cancelled'],
            'cancellation_reason' => ['nullable', 'string', 'max:500'],
            'staff_notes' => ['nullable', 'string', 'max:2000'],
            'document_checklist' => ['nullable', 'array'],
            'starts_at' => ['nullable', 'date'],
            'ends_at' => ['nullable', 'date', 'after:starts_at'],
            'presiding_clergy_id' => ['nullable', 'integer', 'exists:clergy,id'],
            'guest_priest_name' => ['nullable', 'string', 'max:255'],
            'add_to_clergy_directory' => ['nullable', 'boolean'],
            'baptism_type' => ['nullable', 'string', 'in:regular,solo'],
            'amount' => ['nullable', 'numeric', 'min:0'],
            'book_number' => ['required_if:status,completed', 'integer', 'min:1'],
            'page_number' => ['required_if:status,completed', 'integer', 'min:1'],
            'entry_number' => ['required_if:status,completed', 'integer', 'min:1'],
        ]);

        $user = $request->user();
        if (! $user->isArchdioceseWide() && (int) $user->home_parish_id !== (int) $schedule->parish_id) {
            abort(403, 'Access denied.');
        }

        $oldStatus = $schedule->status;
        $newStatus = ScheduleStatusEnum::from($validated['status']);

        $updateData = [
            'status' => $newStatus,
            'cancellation_reason' => $newStatus === ScheduleStatusEnum::CANCELLED ? ($validated['cancellation_reason'] ?? 'Cancelled by staff') : null,
        ];

        if ($request->has('staff_notes')) {
            $updateData['staff_notes'] = $validated['staff_notes'];
        }
        if ($request->has('document_checklist')) {
            $updateData['document_checklist'] = $validated['document_checklist'];
        }
        if ($request->filled('starts_at')) {
            $updateData['starts_at'] = $validated['starts_at'];
            if (! $request->filled('ends_at')) {
                $updateData['ends_at'] = Carbon::parse($validated['starts_at'])->addHours(1);
            }
        }
        if ($request->filled('ends_at')) {
            $updateData['ends_at'] = $validated['ends_at'];
        }
        if ($request->filled('presiding_clergy_id')) {
            $updateData['presiding_clergy_id'] = $validated['presiding_clergy_id'];
        }

        $specificData = $schedule->specific_data ?? [];
        $hasSpecificDataUpdates = false;

        if ($request->filled('guest_priest_name')) {
            $rawGuestName = trim($validated['guest_priest_name']);
            $specificData['guest_priest_name'] = $rawGuestName;
            $hasSpecificDataUpdates = true;

            // When staff confirms/schedules or requests inclusion, automatically inscribe guest into official Clergy Directory
            if ($request->boolean('add_to_clergy_directory', true) && ! empty($rawGuestName)) {
                $newClergy = Clergy::firstOrCreateFromGuestName($rawGuestName, $schedule->parish_id);
                $updateData['presiding_clergy_id'] = $newClergy->id;
            } else {
                $updateData['presiding_clergy_id'] = null; // Unset clergy ID if kept as unregistered guest
            }
        }

        if ($request->has('baptism_type')) {
            $specificData['baptism_type'] = $validated['baptism_type'];
            $hasSpecificDataUpdates = true;
        }

        if ($request->has('amount')) {
            $amountVal = $validated['amount'];
            $specificData['amount'] = ($amountVal !== null && $amountVal !== '') ? (float) $amountVal : null;
            $specificData['donation_amount'] = $specificData['amount'];
            $hasSpecificDataUpdates = true;
        }

        if ($hasSpecificDataUpdates) {
            $updateData['specific_data'] = $specificData;
        }

        $schedule->update($updateData);

        if ($newStatus === ScheduleStatusEnum::COMPLETED && $schedule->record_id === null) {
            $sacramentTypeValue = $schedule->sacrament_type instanceof \BackedEnum
                ? $schedule->sacrament_type->value
                : (string) $schedule->sacrament_type;

            if (in_array($sacramentTypeValue, ['matrimony', 'wedding', 'marriage'], true)) {
                $canonicalType = SacramentTypeEnum::MARRIAGE;
            } else {
                $canonicalType = SacramentTypeEnum::tryFrom($sacramentTypeValue);
            }

            $book = (int) ($validated['book_number'] ?? 0);
            $page = (int) ($validated['page_number'] ?? 0);
            $entry = (int) ($validated['entry_number'] ?? 0);

            if ($book < 1 || $page < 1 || $entry < 1) {
                $latest = SacramentalRecord::query()
                    ->where('originating_parish_id', $schedule->parish_id)
                    ->where('sacrament_type', $canonicalType)
                    ->orderByDesc('book_number')
                    ->orderByDesc('entry_number')
                    ->first();

                $book = $book >= 1 ? $book : ($latest?->book_number ?: 1);
                $entry = $entry >= 1 ? $entry : (($latest?->entry_number ?: 0) + 1);
                $page = $page >= 1 ? $page : (int) ceil($entry / 5);
            }

            $godparentsVal = $schedule->specific_data['godparent_name']
                ?? ($schedule->specific_data['godparents'] ?? ($schedule->specific_data['witnesses'] ?? null));
            if (! $godparentsVal) {
                $gList = array_filter([
                    ! empty($schedule->specific_data['godfather_name']) ? $schedule->specific_data['godfather_name'].' (Ninong)' : '',
                    ! empty($schedule->specific_data['godmother_name']) ? $schedule->specific_data['godmother_name'].' (Ninang)' : '',
                ]);
                if (! empty($gList)) {
                    $godparentsVal = implode(', ', $gList);
                }
            }
            if (is_array($godparentsVal)) {
                $godparentsVal = implode(', ', array_filter(array_map(fn ($g) => is_array($g) ? ($g['name'] ?? '') : (string) $g, $godparentsVal)));
            }

            $eventDate = $schedule->starts_at ? $schedule->starts_at->toDateString() : now()->toDateString();
            $carbonEvent = $schedule->starts_at ? Carbon::parse($schedule->starts_at) : now();

            $ministerName = $schedule->presidingClergy?->titled_name
                ?? ($schedule->presidingClergy?->full_name
                ?? ($schedule->guest_priest_name ?? ''));

            $stipendPesos = isset($schedule->specific_data['stipend_pesos']) ? (string) $schedule->specific_data['stipend_pesos'] : ($schedule->amount ? (string) floor($schedule->amount) : '0');
            $stipendCts = isset($schedule->specific_data['stipend_cts']) ? (string) $schedule->specific_data['stipend_cts'] : '00';

            if ($canonicalType === SacramentTypeEnum::MARRIAGE) {
                // Groom Person
                $groomFullName = $schedule->specific_data['groom_name']
                    ?? ($schedule->specific_data['husband_name'] ?? ($schedule->requester_name ?? 'Groom'));
                $gParts = explode(' ', trim($groomFullName));
                $gLast = count($gParts) > 1 ? array_pop($gParts) : 'Unknown';
                $gFirst = count($gParts) > 0 ? implode(' ', $gParts) : ($groomFullName ?: 'Unknown');

                $groomPerson = Person::firstOrCreate(
                    [
                        'first_name' => $gFirst,
                        'last_name' => $gLast,
                    ],
                    [
                        'sex' => 'male',
                        'date_of_birth' => $schedule->specific_data['groom_dob'] ?? null,
                        'place_of_birth' => $schedule->specific_data['groom_pob'] ?? null,
                        'father_name' => $schedule->specific_data['groom_father_name'] ?? null,
                        'mother_name' => $schedule->specific_data['groom_mother_name'] ?? null,
                    ]
                );

                // Bride Person
                $brideFullName = $schedule->specific_data['bride_name']
                    ?? ($schedule->specific_data['wife_name'] ?? 'Bride');
                $bParts = explode(' ', trim($brideFullName));
                $bLast = count($bParts) > 1 ? array_pop($bParts) : 'Unknown';
                $bFirst = count($bParts) > 0 ? implode(' ', $bParts) : ($brideFullName ?: 'Unknown');

                $bridePerson = Person::firstOrCreate(
                    [
                        'first_name' => $bFirst,
                        'last_name' => $bLast,
                    ],
                    [
                        'sex' => 'female',
                        'date_of_birth' => $schedule->specific_data['bride_dob'] ?? null,
                        'place_of_birth' => $schedule->specific_data['bride_pob'] ?? null,
                        'father_name' => $schedule->specific_data['bride_father_name'] ?? null,
                        'mother_name' => $schedule->specific_data['bride_mother_name'] ?? null,
                    ]
                );

                $record = SacramentalRecord::create([
                    'person_id' => $groomPerson->id,
                    'spouse_person_id' => $bridePerson->id,
                    'sacrament_type' => SacramentTypeEnum::MARRIAGE,
                    'event_date' => $eventDate,
                    'originating_parish_id' => $schedule->parish_id,
                    'performed_by_clergy_id' => $schedule->presiding_clergy_id,
                    'book_number' => $book,
                    'page_number' => $page,
                    'entry_number' => $entry,
                    'witnesses' => $godparentsVal,
                    'status' => 'registered',
                ]);

                $schedule->update(['record_id' => $record->id]);
            } elseif ($canonicalType) {
                // Baptism or Confirmation
                $fullName = $schedule->specific_data['candidate_name']
                    ?? ($schedule->specific_data['child_name'] ?? ($schedule->requester_name ?? 'Unknown'));
                $nameParts = explode(' ', trim($fullName));
                $firstName = array_shift($nameParts);
                $lastName = count($nameParts) > 0 ? implode(' ', $nameParts) : 'Unknown';

                $dob = $schedule->specific_data['candidate_dob'] ?? ($schedule->specific_data['dob'] ?? null);
                $pob = $schedule->specific_data['place_of_birth'] ?? ($schedule->specific_data['birthplace'] ?? null);
                $mother = $schedule->specific_data['candidate_mother_name'] ?? ($schedule->specific_data['mother_name'] ?? null);
                $father = $schedule->specific_data['candidate_father_name'] ?? ($schedule->specific_data['father_name'] ?? null);

                $person = Person::firstOrCreate(
                    [
                        'first_name' => $firstName,
                        'last_name' => $lastName,
                    ],
                    [
                        'sex' => $schedule->specific_data['candidate_gender'] ?? ($schedule->specific_data['gender'] ?? 'unknown'),
                        'date_of_birth' => $dob,
                        'place_of_birth' => $pob,
                        'mother_name' => $mother,
                        'father_name' => $father,
                    ]
                );

                $legitimacyInput = strtolower((string) ($schedule->specific_data['legitimacy'] ?? ''));
                $isLegitimate = ! in_array($legitimacyInput, ['illegitimate', 'nat', 'nat.']);
                $legitimacyEnum = $isLegitimate ? LegitimacyStatusEnum::LEGITIMATE : LegitimacyStatusEnum::ILLEGITIMATE;
                $legitimacyStr = $isLegitimate ? 'LEG.' : 'NAT.';

                $carbonBirth = $dob ? Carbon::parse($dob) : null;

                // Build church book columns (matching XML schema)
                if ($canonicalType === SacramentTypeEnum::BAPTISM) {
                    $bookData = [
                        'no' => $entry,
                        'baptismi_annus' => $carbonEvent->format('Y'),
                        'baptismi_mensis_et_dies' => $carbonEvent->translatedFormat('F j'),
                        'baptizatorum_nomina_et_cognomina' => $fullName,
                        'nativitatis_annus' => $carbonBirth ? $carbonBirth->format('Y') : '',
                        'nativitatis_mensis_et_dies' => $carbonBirth ? $carbonBirth->translatedFormat('F j') : '',
                        'nativitatis_legitimitas' => $legitimacyStr,
                        'nativitatis_locus' => (string) ($pob ?? ''),
                        'parentum_nomina_et_cognomina' => trim("{$father} / {$mother}", ' /'),
                        'parentum_originis_locus' => (string) ($schedule->specific_data['parents_origin'] ?? ''),
                        'parentum_habitationis_locus' => (string) ($schedule->specific_data['parents_residence'] ?? ($schedule->specific_data['parents_address'] ?? '')),
                        'patrinorum_nomina_et_cognomina' => (string) $godparentsVal,
                        'patrinorum_habitationis_locus' => (string) ($schedule->specific_data['godparents_address'] ?? ''),
                        'stipendium_pesos' => $stipendPesos,
                        'stipendium_cts' => $stipendCts,
                        'nomen_ministri' => $ministerName,
                        'observanda' => (string) ($schedule->notes ?? ($schedule->specific_data['notes'] ?? '')),
                    ];
                } else {
                    // Confirmation
                    $age = (string) ($schedule->specific_data['age'] ?? ($schedule->specific_data['aetas'] ?? ''));
                    if (! $age && $carbonBirth) {
                        $age = (string) $carbonBirth->diffInYears($carbonEvent);
                    }

                    $bookData = [
                        'no' => $entry,
                        'annus' => $carbonEvent->format('Y'),
                        'mensis_et_dies' => $carbonEvent->translatedFormat('F j'),
                        'confirmatorum' => $fullName,
                        'aetas' => $age,
                        'parochia' => (string) ($schedule->specific_data['parish_of_baptism'] ?? ($schedule->specific_data['parochia'] ?? '')),
                        'provincia' => (string) ($schedule->specific_data['province_of_baptism'] ?? ($schedule->specific_data['provincia'] ?? '')),
                        'locus_baptismi' => (string) ($schedule->specific_data['place_of_baptism'] ?? ($schedule->specific_data['locus_baptismi'] ?? '')),
                        'parentum' => trim("{$father} / {$mother}", ' /'),
                        'patrinorum' => (string) $godparentsVal,
                        'stipendium_pesos' => $stipendPesos,
                        'stipendium_cts' => $stipendCts,
                        'nomen_ministri' => $ministerName,
                        'observanda' => (string) ($schedule->notes ?? ($schedule->specific_data['notes'] ?? '')),
                    ];
                }

                $record = SacramentalRecord::create([
                    'person_id' => $person->id,
                    'sacrament_type' => $canonicalType,
                    'event_date' => $eventDate,
                    'originating_parish_id' => $schedule->parish_id,
                    'performed_by_clergy_id' => $schedule->presiding_clergy_id,
                    'book_number' => $book,
                    'page_number' => $page,
                    'entry_number' => $entry,
                    'legitimacy' => $legitimacyEnum,
                    'godparents' => $godparentsVal,
                    'place_of_event' => $pob,
                    'book_data' => $bookData,
                    'status' => 'registered',
                ]);

                $schedule->update(['record_id' => $record->id]);
            }
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
        $parishId = $user->home_parish_id ?? Parish::where('is_active', true)->value('id');

        $settings = SacramentSetting::where('parish_id', $parishId)->get();

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
            'settings.*.allowed_days' => ['nullable', 'array'],
            'settings.*.time_slots' => ['nullable', 'array'],
        ]);

        $user = $request->user();
        $parishId = $user->home_parish_id ?? Parish::where('is_active', true)->value('id');

        foreach ($validated['settings'] as $settingData) {
            SacramentSetting::updateOrCreate(
                ['parish_id' => $parishId, 'sacrament_type' => $settingData['sacrament_type']],
                [
                    'is_available' => $settingData['is_available'],
                    'allowed_days' => $settingData['allowed_days'] ?? null,
                    'time_slots' => $settingData['time_slots'] ?? ['08:00-09:00', '09:00-10:00', '10:00-11:00', '11:00-12:00'],
                ]
            );
        }

        return redirect()->back()->with('success', 'Sacrament settings updated successfully.');
    }

    /**
     * Verify online payment receipt or mark payment status.
     */
    public function verifyPayment(Request $request, SacramentSchedule $schedule): RedirectResponse
    {
        $user = $request->user();
        if (! $user->isArchdioceseWide() && (int) $user->home_parish_id !== (int) $schedule->parish_id) {
            abort(403, 'Unauthorized to verify payments for other parishes.');
        }

        $validated = $request->validate([
            'payment_status' => ['required', 'string', 'in:paid,rejected,unpaid,pending_verification'],
        ]);

        $oldStatus = $schedule->payment_status;
        $schedule->payment_status = $validated['payment_status'];
        $schedule->save();

        AuditService::record(
            AuditActionEnum::UPDATE,
            $schedule,
            ['payment_status' => $oldStatus],
            ['payment_status' => $schedule->payment_status],
            "Payment status for schedule #{$schedule->id} verified as {$schedule->payment_status} by {$user->username}",
            $user
        );

        return redirect()->back()->with('success', "Payment verification recorded: marked as {$schedule->payment_status}.");
    }
}
