<?php

namespace App\Http\Controllers;

use App\Enums\DocumentRequestStatusEnum;
use App\Enums\RequestStatusEnum;
use App\Models\CertificateRequest;
use App\Models\DocumentRequest;
use App\Models\SacramentalRecord;
use App\Services\AuditService;
use App\Services\DocumentWorkflowService;
use App\Services\ParishScopingService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class CertificatesController extends Controller
{
    public function __construct(
        protected DocumentWorkflowService $workflowService
    ) {}

    /**
     * Display staff certificate processing queue.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        $tab = $request->query('tab', 'all');
        $status = $request->query('status', 'all');
        $search = trim((string) $request->query('search', ''));

        // Query certificate requests
        $certQuery = CertificateRequest::query()
            ->with(['record.person', 'record.originatingParish', 'requesterUser']);

        if (!$user->isArchdioceseWide()) {
            $certQuery->whereHas('record', fn ($q) => $q->where('originating_parish_id', $user->home_parish_id));
        }

        if ($status !== 'all') {
            $certQuery->where('status', $status);
        }

        if ($search) {
            $certQuery->where(function ($q) use ($search) {
                $q->where('requester_name', 'like', "%{$search}%")
                  ->orWhere('certificate_number', 'like', "%{$search}%")
                  ->orWhereHas('record.person', function ($pq) use ($search) {
                      $pq->where('first_name', 'like', "%{$search}%")
                         ->orWhere('last_name', 'like', "%{$search}%");
                  });
            });
        }

        $certificateRequests = $certQuery->orderByDesc('id')->paginate(15, ['*'], 'cert_page')->withQueryString();

        // Query document requests
        $docQuery = DocumentRequest::query()
            ->with(['targetedParish', 'parishioner', 'certificateRequest', 'matchedRecord.person']);

        if (!$user->isArchdioceseWide()) {
            $docQuery->where(function ($q) use ($user) {
                $q->where('targeted_parish_id', $user->home_parish_id)
                  ->orWhereNull('targeted_parish_id');
            });
        }

        if ($status !== 'all') {
            $docQuery->where('status', $status);
        }

        if ($search) {
            $docQuery->where(function ($q) use ($search) {
                $q->where('tracking_code', 'like', "%{$search}%")
                  ->orWhere('name_on_record', 'like', "%{$search}%");
            });
        }

        $documentRequests = $docQuery->orderByDesc('id')->paginate(15, ['*'], 'doc_page')->withQueryString();

        $stats = ParishScopingService::combinedRequestStats($user);

        $recordsQuery = SacramentalRecord::query()->with(['person', 'originatingParish']);
        if (!$user->isArchdioceseWide()) {
            $recordsQuery->where('originating_parish_id', $user->home_parish_id);
        }
        $availableRecords = $recordsQuery->orderByDesc('id')->limit(50)->get();

        return Inertia::render('Certificates/Index', [
            'certificateRequests' => $certificateRequests,
            'documentRequests' => $documentRequests,
            'availableRecords' => $availableRecords,
            'filters' => [
                'tab' => $tab,
                'status' => $status,
                'search' => $search,
            ],
            'stats' => $stats,
        ]);
    }

    /**
     * Create an internal certificate request for a sacramental record.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'record_id' => ['required', 'integer', 'exists:sacramental_records,id'],
            'parishioner_id' => ['nullable', 'integer', 'exists:users,id'],
            'requester_name' => ['required', 'string', 'max:255'],
            'requester_contact' => ['nullable', 'string', 'regex:/^[0-9]{7}$/'],
            'purpose' => ['required', 'string', 'max:500'],
        ], [
            'requester_contact.regex' => 'Contact number must be exactly 7 digits (e.g., 7562572).',
        ]);

        $record = SacramentalRecord::with(['person', 'originatingParish'])->findOrFail($validated['record_id']);
        $user = $request->user();

        if (!ParishScopingService::canViewRecord($user, $record)) {
            abort(403, 'Unauthorized to request certificates for this parish.');
        }

        $requesterUserId = !empty($validated['parishioner_id'])
            ? (int) $validated['parishioner_id']
            : $user->id;

        $certificate = CertificateRequest::create([
            'record_id' => $record->id,
            'requester_user_id' => $requesterUserId,
            'requester_name' => $validated['requester_name'],
            'requester_contact' => $validated['requester_contact'] ?? null,
            'purpose' => $validated['purpose'],
            'status' => RequestStatusEnum::PENDING,
        ]);

        // If filed on behalf of a registered parishioner, create a synchronized DocumentRequest
        // so it immediately appears in the parishioner's portal dashboard under My Claims & Orders!
        if (!empty($validated['parishioner_id'])) {
            $trackingCode = 'RCAL-REQ-' . strtoupper(Str::random(8));
            DocumentRequest::create([
                'tracking_code' => $trackingCode,
                'parishioner_id' => $requesterUserId,
                'targeted_parish_id' => $record->originating_parish_id,
                'sacrament_type' => $record->sacrament_type,
                'name_on_record' => $record->person?->full_name ?: $validated['requester_name'],
                'date_of_birth' => $record->person?->date_of_birth ?: now()->subYears(20)->toDateString(),
                'date_of_sacrament' => $record->event_date,
                'place_of_sacrament' => $record->originatingParish?->name,
                'relationship_to_owner' => 'Requester',
                'purpose' => $validated['purpose'],
                'status' => DocumentRequestStatusEnum::UNDER_REVIEW,
                'matched_record_id' => $record->id,
                'certificate_request_id' => $certificate->id,
                'internal_note' => "Staff-assisted request initialized by {$user->username} for parishioner.",
                'consent_given_at' => now(),
                'consent_version' => '1.0',
            ]);
        }

        AuditService::log(
            $request,
            \App\Enums\AuditActionEnum::CREATE,
            'certificate_request',
            $certificate->id,
            "Certificate request #{$certificate->id} initialized by {$user->username}" . (!empty($validated['parishioner_id']) ? " on behalf of parishioner #{$validated['parishioner_id']}" : '')
        );

        return redirect()->route('certificates.show', $certificate->id)
            ->with('success', "Certificate order #{$certificate->id} initialized.");
    }

    /**
     * Match a public parishioner claim to a sacramental record and initialize the certificate request.
     */
    public function matchClaim(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'document_request_id' => ['required', 'integer', 'exists:document_requests,id'],
            'record_id' => ['required', 'integer', 'exists:sacramental_records,id'],
        ]);

        $user = $request->user();
        $doc = DocumentRequest::with(['parishioner'])->findOrFail($validated['document_request_id']);
        $record = SacramentalRecord::with(['person', 'originatingParish'])->findOrFail($validated['record_id']);

        if (!ParishScopingService::canViewRecord($user, $record)) {
            abort(403, 'Unauthorized to link records outside your parish jurisdiction.');
        }

        if ($doc->certificate_request_id) {
            return redirect()->route('certificates.show', $doc->certificate_request_id)
                ->with('info', "Parishioner claim {$doc->tracking_code} is already linked to Certificate Order #{$doc->certificate_request_id}.");
        }

        $certificate = CertificateRequest::create([
            'record_id' => $record->id,
            'requester_user_id' => $doc->parishioner_id,
            'requester_name' => $doc->name_on_record,
            'requester_contact' => $doc->parishioner?->phone,
            'purpose' => $doc->purpose ?: 'Parishioner Document Claim',
            'status' => RequestStatusEnum::PENDING,
        ]);

        $doc->update([
            'matched_record_id' => $record->id,
            'certificate_request_id' => $certificate->id,
            'status' => DocumentRequestStatusEnum::UNDER_REVIEW,
            'internal_note' => "Claim matched to Register Record #{$record->id} ({$record->citation}) by {$user->username}.",
        ]);

        AuditService::log(
            $request,
            \App\Enums\AuditActionEnum::CREATE,
            'certificate_request',
            $certificate->id,
            "Claim {$doc->tracking_code} matched to Record #{$record->id} by {$user->username}, initializing Order #{$certificate->id}"
        );

        return redirect()->route('certificates.show', $certificate->id)
            ->with('success', "Parishioner claim {$doc->tracking_code} successfully matched and directed to Certificate Order #{$certificate->id}.");
    }

    /**
     * Show certificate details with 5-step lifecycle tracker and actions.
     */
    public function show(Request $request, CertificateRequest $certificate): Response
    {
        $user = $request->user();

        $certificate->load([
            'record.person',
            'record.spouse',
            'record.performedByClergy',
            'record.originatingParish.vicariate',
            'record.annotations.annotatedByUser',
            'requesterUser',
            'verifiedByUser',
            'approvedByUser',
            'issuedByUser',
            'rejectedByUser',
            'linkedDocumentRequest',
        ]);

        if (!ParishScopingService::canViewRecord($user, $certificate->record)) {
            abort(403, 'Access denied. Certificate belongs to another parish jurisdiction.');
        }

        return Inertia::render('Certificates/Detail', [
            'certificate' => $certificate,
        ]);
    }

    /**
     * Transition certificate request state with validation and guards.
     */
    public function transition(Request $request, CertificateRequest $certificate): RedirectResponse
    {
        $validated = $request->validate([
            'target_status' => ['required', 'string', 'in:verified,approved,processing,ready,issued,rejected,cancelled'],
            'reason' => ['nullable', 'string', 'max:1000'],
        ]);

        $user = $request->user();

        if (!ParishScopingService::canWriteRecord($user, $certificate->record)) {
            abort(403, 'Access denied. You may only transition certificates in your parish jurisdiction.');
        }

        $targetEnum = RequestStatusEnum::from($validated['target_status']);

        // Check permission for issuing: only authorized roles can issue
        if ($targetEnum === RequestStatusEnum::ISSUED && !$user->canIssueCertificates()) {
            abort(403, 'Only Parish Priests, Chancery staff, and Curia Administrators may issue official certificates.');
        }

        $this->workflowService->transitionCertificate(
            $certificate,
            $targetEnum,
            $user,
            $validated['reason'] ?? null
        );

        return redirect()->route('certificates.show', $certificate->id)
            ->with('success', "Certificate state transitioned to {$targetEnum->label()}.");
    }

    /**
     * Render printable Archdiocesan certificate preview.
     */
    public function printCertificate(Request $request, CertificateRequest $certificate): Response
    {
        $user = $request->user();

        $certificate->load([
            'record.person',
            'record.spouse',
            'record.performedByClergy',
            'record.originatingParish.vicariate',
            'record.annotations',
            'issuedByUser',
        ]);

        if (!ParishScopingService::canViewRecord($user, $certificate->record)) {
            abort(403, 'Access denied. Cannot print certificate.');
        }

        // Must be issued
        if ($certificate->status !== RequestStatusEnum::ISSUED) {
            return redirect()->route('certificates.show', $certificate->id)
                ->with('error', 'Only officially issued certificates may be printed.');
        }

        // Log print action for RA 10173 compliance
        AuditService::log(
            $request,
            \App\Enums\AuditActionEnum::PRINT,
            'certificate_request',
            $certificate->id,
            "Certificate {$certificate->certificate_number} printed by {$user->username}"
        );

        return Inertia::render('Certificates/Print', [
            'certificate' => $certificate,
        ]);
    }
}
