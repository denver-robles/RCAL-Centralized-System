<?php

namespace App\Http\Controllers;

use App\Enums\AnnotationTypeEnum;
use App\Enums\RoleEnum;
use App\Enums\ScheduleStatusEnum;
use App\Models\Clergy;
use App\Models\Parish;
use App\Models\SacramentalRecord;
use App\Models\SacramentSchedule;
use App\Models\User;
use App\Services\AuditService;
use App\Services\Canon535Service;
use App\Services\ParishScopingService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class RecordsController extends Controller
{
    public function __construct(
        protected Canon535Service $canonService
    ) {}

    /**
     * Display a listing of sacramental records with filtering and parish scoping.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        $query = SacramentalRecord::query()
            ->with(['person', 'spouse', 'performedByClergy', 'originatingParish', 'annotations']);

        // Multi-tenant parish scoping
        ParishScopingService::scopeParish($query, $user, 'originating_parish_id');

        // Filter by Sacrament Type
        if ($request->filled('sacrament_type') && $request->query('sacrament_type') !== 'all') {
            $query->where('sacrament_type', $request->query('sacrament_type'));
        }

        // Filter by Parish (for Chancery / Admin)
        if ($request->filled('parish_id') && $request->query('parish_id') !== 'all') {
            $query->where('originating_parish_id', (int) $request->query('parish_id'));
        }

        // Filter by Status
        if ($request->filled('status') && $request->query('status') !== 'all') {
            $query->where('status', $request->query('status'));
        }

        // Search by subject name, spouse, citation, parish, or annotations
        $search = trim((string) ($request->query('search') ?: $request->query('name') ?: ''));
        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->whereHas('person', function ($pq) use ($search) {
                    $pq->where('first_name', 'ilike', "%{$search}%")
                        ->orWhere('last_name', 'ilike', "%{$search}%")
                        ->orWhere('middle_name', 'ilike', "%{$search}%")
                        ->orWhere('father_name', 'ilike', "%{$search}%")
                        ->orWhere('mother_name', 'ilike', "%{$search}%");
                })->orWhereHas('spouse', function ($sq) use ($search) {
                    $sq->where('first_name', 'ilike', "%{$search}%")
                        ->orWhere('last_name', 'ilike', "%{$search}%");
                })->orWhereHas('originatingParish', function ($opq) use ($search) {
                    $opq->where('name', 'ilike', "%{$search}%")
                        ->orWhere('address', 'ilike', "%{$search}%")
                        ->orWhere('city_municipality', 'ilike', "%{$search}%");
                })->orWhere('book_number', 'like', "%{$search}%")
                    ->orWhere('page_number', 'like', "%{$search}%")
                    ->orWhere('entry_number', 'like', "%{$search}%")
                    ->orWhere('godparents', 'ilike', "%{$search}%")
                    ->orWhere('place_of_event', 'ilike', "%{$search}%")
                    ->orWhere('register_notes', 'ilike', "%{$search}%");
            });
        }

        // Book/Page/Entry filters
        if ($request->filled('book')) {
            $query->where('book_number', (int) $request->query('book'));
        }
        if ($request->filled('page')) {
            $query->where('page_number', (int) $request->query('page'));
        }
        if ($request->filled('entry')) {
            $query->where('entry_number', (int) $request->query('entry'));
        }

        // Filter by Year of sacrament event
        if ($request->filled('year')) {
            $query->whereYear('event_date', (int) $request->query('year'));
        }

        $records = $query->orderByDesc('event_date')->orderByDesc('id')->paginate(20)->withQueryString();

        $ledgerQuery = SacramentalRecord::query()
            ->with(['person', 'spouse', 'performedByClergy', 'originatingParish']);
        ParishScopingService::scopeParish($ledgerQuery, $user, 'originating_parish_id');
        if ($request->filled('parish_id') && $request->query('parish_id') !== 'all') {
            $ledgerQuery->where('originating_parish_id', (int) $request->query('parish_id'));
        }
        $ledgerRecords = $ledgerQuery->orderBy('book_number')->orderBy('entry_number')->get();

        $stats = ParishScopingService::sacramentCounts($user);
        $scopedParish = ParishScopingService::visibleParish($user);
        $parishes = $user->isArchdioceseWide()
            ? Parish::query()->where('is_active', true)->orderBy('name')->get(['id', 'name', 'city_municipality'])
            : ($scopedParish ? collect([$scopedParish]) : collect());

        $clergy = Clergy::query()
            ->where('is_active', true)
            ->orderBy('last_name')
            ->get(['id', 'first_name', 'last_name', 'title']);

        return Inertia::render('Records/Index', [
            'records' => $records,
            'ledgerRecords' => $ledgerRecords,
            'parishes' => $parishes,
            'clergy' => $clergy,
            'filters' => [
                'search' => $search,
                'name' => $search,
                'sacrament_type' => (string) $request->query('sacrament_type', ''),
                'parish_id' => (string) $request->query('parish_id', ''),
                'status' => (string) $request->query('status', ''),
                'year' => (string) $request->query('year', ''),
                'book' => (string) $request->query('book', ''),
                'page' => (string) $request->query('page', ''),
                'entry' => (string) $request->query('entry', ''),
            ],
            'stats' => $stats,
            'scopedParish' => $scopedParish,
        ]);
    }

    /**
     * Show canonical transcription form (Can. 535 §1).
     */
    public function create(Request $request): Response
    {
        $user = $request->user();

        $parishes = $user->isArchdioceseWide()
            ? Parish::query()->where('is_active', true)->orderBy('name')->get(['id', 'name', 'city_municipality'])
            : Parish::query()->where('id', $user->home_parish_id)->get(['id', 'name', 'city_municipality']);

        $clergy = Clergy::query()
            ->where('is_active', true)
            ->orderBy('last_name')
            ->get(['id', 'first_name', 'last_name', 'title']);

        $schedule = null;
        if ($request->filled('from_schedule_id')) {
            $schedule = SacramentSchedule::with(['presidingClergy', 'venue'])
                ->find($request->query('from_schedule_id'));
        }

        return Inertia::render('Records/Create', [
            'parishes' => $parishes,
            'clergy' => $clergy,
            'prefillSchedule' => $schedule,
        ]);
    }

    /**
     * Inscribe a new canonical register entry.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'originating_parish_id' => ['required', 'integer', 'exists:parishes,id'],
            'sacrament_type' => ['required', 'string', 'in:baptism,confirmation,marriage,death'],
            'event_date' => ['required', 'date'],
            'book_number' => ['required', 'integer', 'min:1'],
            'page_number' => ['required', 'integer', 'min:1'],
            'entry_number' => ['required', 'integer', 'min:1'],
            'performed_by_clergy_id' => ['nullable', 'integer', 'exists:clergy,id'],

            // Subject person
            'first_name' => ['required', 'string', 'max:100'],
            'middle_name' => ['nullable', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],
            'suffix' => ['nullable', 'string', 'in:Jr.,Sr.,II,III,IV,V,VI'],
            'sex' => ['required', 'string', 'in:male,female'],
            'date_of_birth' => ['nullable', 'date'],
            'place_of_birth' => ['nullable', 'string', 'max:255'],
            'father_name' => ['nullable', 'string', 'max:255'],
            'mother_name' => ['nullable', 'string', 'max:255'],

            // Marriage specific
            'spouse_first_name' => ['nullable', 'string', 'max:100'],
            'spouse_last_name' => ['nullable', 'string', 'max:100'],

            // Canonical attributes
            'legitimacy' => ['nullable', 'string', 'in:legitimate,illegitimate,legitimated,unknown'],
            'godparents' => ['nullable', 'string'],
            'witnesses' => ['nullable', 'string'],
            'place_of_event' => ['nullable', 'string', 'max:255'],
            'register_notes' => ['nullable', 'string'],

            'from_schedule_id' => ['nullable', 'integer', 'exists:sacrament_schedules,id'],
        ], [
            'suffix.in' => 'Suffix must be one of: Jr., Sr., II, III, IV, V, VI.',
        ]);

        $record = $this->canonService->transcribeRecord($validated, $request->user());

        if (! empty($validated['from_schedule_id'])) {
            $schedule = SacramentSchedule::find($validated['from_schedule_id']);
            if ($schedule) {
                $schedule->update([
                    'record_id' => $record->id,
                    'status' => ScheduleStatusEnum::COMPLETED,
                ]);
            }
        }

        return redirect()->route('records.show', $record->id)
            ->with('success', "Canonical record successfully inscribed in registry with citation: {$record->citation}");
    }

    /**
     * Display a specific sacramental record with Folio view and annotations.
     */
    public function show(Request $request, SacramentalRecord $record): Response
    {
        $user = $request->user();

        if (! ParishScopingService::canViewRecord($user, $record)) {
            abort(403, 'Access denied. You may only view sacramental records inscribed in your parish jurisdiction.');
        }

        // Log RA 10173 access log
        AuditService::logAccess($user, $record, 'view');

        $record->load([
            'person',
            'spouse',
            'originatingParish.vicariate',
            'performedByClergy',
            'annotations.annotatedByUser',
        ]);

        // Find related sacraments for the same subject person
        $otherRecords = SacramentalRecord::query()
            ->with(['originatingParish'])
            ->where('person_id', $record->person_id)
            ->where('id', '!=', $record->id)
            ->get();

        $clergyList = Clergy::query()
            ->where('is_active', true)
            ->orderBy('last_name')
            ->get(['id', 'first_name', 'last_name', 'title']);

        $canWrite = ParishScopingService::canWriteRecord($user, $record);

        $annotationTypes = [
            ['value' => 'marriage', 'label' => 'Holy Matrimony (Can. 1055)', 'links_to_record' => true],
            ['value' => 'holy_orders', 'label' => 'Holy Orders / Diaconate / Priesthood', 'links_to_record' => false],
            ['value' => 'solemn_profession', 'label' => 'Solemn Religious Profession', 'links_to_record' => false],
            ['value' => 'nullity', 'label' => 'Decree of Nullity / Dissolution', 'links_to_record' => false],
            ['value' => 'correction', 'label' => 'Canonical Rectification / Correction', 'links_to_record' => false],
            ['value' => 'adoption', 'label' => 'Legal / Canonical Adoption', 'links_to_record' => false],
            ['value' => 'confirmation', 'label' => 'Confirmation Notation', 'links_to_record' => true],
            ['value' => 'other', 'label' => 'Other Curial Marginal Annotation', 'links_to_record' => false],
        ];

        $parishioners = User::query()
            ->where('role', RoleEnum::PARISHIONER)
            ->where('is_active', true)
            ->orderBy('display_name')
            ->get(['id', 'display_name', 'username', 'email', 'phone']);

        return Inertia::render('Records/Detail', [
            'record' => $record,
            'otherRecords' => $otherRecords,
            'clergyList' => $clergyList,
            'canWrite' => $canWrite,
            'annotationTypes' => $annotationTypes,
            'parishioners' => $parishioners,
        ]);
    }

    /**
     * Add a Canon 535 §2 marginal annotation.
     */
    public function annotate(Request $request, SacramentalRecord $record): RedirectResponse
    {
        $user = $request->user();

        if (! ParishScopingService::canWriteRecord($user, $record)) {
            abort(403, 'Access denied. You may only annotate records belonging to your parish.');
        }

        $validated = $request->validate([
            'annotation_type' => ['required', 'string', 'in:marriage,holy_orders,solemn_profession,nullity,correction,adoption,confirmation,other'],
            'note_text' => ['required', 'string', 'min:3', 'max:2000'],
            'decree_reference' => ['nullable', 'string', 'max:255'],
            'reference_record_id' => ['nullable', 'integer', 'exists:sacramental_records,id'],
            'event_date' => ['nullable', 'date'],
        ]);

        $annotationType = AnnotationTypeEnum::from($validated['annotation_type']);

        $this->canonService->addAnnotation(
            $record,
            $annotationType,
            $validated['note_text'],
            $user,
            $validated['event_date'] ?? null,
            $validated['decree_reference'] ?? null,
            isset($validated['reference_record_id']) ? (int) $validated['reference_record_id'] : null
        );

        return redirect()->route('records.show', $record->id)
            ->with('success', 'Marginal annotation inscribed according to Canon 535 §2.');
    }

    /**
     * Void an erroneously transcribed entry (retains physical row trace).
     */
    public function voidRecord(Request $request, SacramentalRecord $record): RedirectResponse
    {
        $user = $request->user();

        if (! $user->isArchdioceseWide() && (int) $user->home_parish_id !== (int) $record->originating_parish_id) {
            abort(403, 'Unauthorized to void record.');
        }

        $validated = $request->validate([
            'reason' => ['required', 'string', 'min:5', 'max:500'],
        ]);

        $this->canonService->voidEntry($record, $validated['reason'], $user);

        return redirect()->route('records.show', $record->id)
            ->with('warning', 'Register entry marked as VOIDED in accordance with Chancery canonical guidelines.');
    }

    /**
     * Update physical ledger book citation (Book No., Page No., Line No.) and canonical book details.
     */
    public function updateBook(Request $request, SacramentalRecord $record): RedirectResponse
    {
        $user = $request->user();

        if (! ParishScopingService::canWriteRecord($user, $record)) {
            abort(403, 'Access denied. You may only record or edit entries belonging to your parish.');
        }

        $validated = $request->validate([
            'book_number' => ['required', 'integer', 'min:1'],
            'page_number' => ['required', 'integer', 'min:1'],
            'entry_number' => ['required', 'integer', 'min:1'],

            // Subject / Person details
            'first_name' => ['required', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],
            'middle_name' => ['nullable', 'string', 'max:100'],
            'date_of_birth' => ['nullable', 'date'],
            'place_of_birth' => ['nullable', 'string', 'max:255'],
            'father_name' => ['nullable', 'string', 'max:255'],
            'mother_name' => ['nullable', 'string', 'max:255'],

            // Canonical & ledger details
            'event_date' => ['nullable', 'date'],
            'legitimacy' => ['nullable', 'string'],
            'godparents' => ['nullable', 'string'],
            'place_of_event' => ['nullable', 'string', 'max:255'],
            'performed_by_clergy_id' => ['nullable', 'integer', 'exists:clergy,id'],
            'register_notes' => ['nullable', 'string'],

            // Physical book attributes (stored in book_data JSON)
            'book_data' => ['nullable', 'array'],
        ]);

        // Check if another record already has this citation in the same parish & sacrament type
        $existing = SacramentalRecord::query()
            ->where('originating_parish_id', $record->originating_parish_id)
            ->where('sacrament_type', $record->sacrament_type)
            ->where('book_number', $validated['book_number'])
            ->where('page_number', $validated['page_number'])
            ->where('entry_number', $validated['entry_number'])
            ->where('id', '!=', $record->id)
            ->first();

        if ($existing) {
            return back()->withErrors([
                'entry_number' => "Book {$validated['book_number']}, Page {$validated['page_number']}, Line {$validated['entry_number']} is already occupied by record #{$existing->id} ({$existing->person?->full_name}).",
            ]);
        }

        // Update Person
        if ($record->person) {
            $record->person->update([
                'first_name' => $validated['first_name'],
                'last_name' => $validated['last_name'],
                'middle_name' => $validated['middle_name'] ?? $record->person->middle_name,
                'date_of_birth' => $validated['date_of_birth'] ?? $record->person->date_of_birth,
                'place_of_birth' => $validated['place_of_birth'] ?? $record->person->place_of_birth,
                'father_name' => $validated['father_name'] ?? $record->person->father_name,
                'mother_name' => $validated['mother_name'] ?? $record->person->mother_name,
            ]);
        }

        // Merge book_data
        $currentBookData = is_array($record->book_data) ? $record->book_data : [];
        $newBookData = array_merge($currentBookData, $validated['book_data'] ?? []);
        $newBookData['no'] = $validated['entry_number'];

        // Update Sacramental Record citation & fields
        $record->allowCitationUpdate = true;
        $record->update([
            'book_number' => $validated['book_number'],
            'page_number' => $validated['page_number'],
            'entry_number' => $validated['entry_number'],
            'event_date' => $validated['event_date'] ?? $record->event_date,
            'legitimacy' => $validated['legitimacy'] ?? $record->legitimacy,
            'godparents' => $validated['godparents'] ?? $record->godparents,
            'place_of_event' => $validated['place_of_event'] ?? $record->place_of_event,
            'performed_by_clergy_id' => $validated['performed_by_clergy_id'] ?? $record->performed_by_clergy_id,
            'register_notes' => $validated['register_notes'] ?? $record->register_notes,
            'book_data' => $newBookData,
            'status' => 'registered',
        ]);

        AuditService::record(
            AuditActionEnum::UPDATE,
            $record,
            ['book' => $record->getOriginal('book_number'), 'page' => $record->getOriginal('page_number'), 'entry' => $record->getOriginal('entry_number')],
            ['book' => $record->book_number, 'page' => $record->page_number, 'entry' => $record->entry_number],
            "Ledger book coordinates updated: Book {$record->book_number}, Page {$record->page_number}, Line {$record->entry_number}",
            $user
        );

        return back()->with('success', "Record successfully inscribed into Church Book {$record->book_number}, Page {$record->page_number}, Line {$record->entry_number}.");
    }
}
