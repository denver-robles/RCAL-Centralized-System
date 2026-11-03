<?php

namespace App\Http\Controllers;

use App\Enums\DocumentRequestStatusEnum;
use App\Enums\RequestStatusEnum;
use App\Enums\SacramentTypeEnum;
use App\Enums\ScheduleStatusEnum;
use App\Models\CertificateRequest;
use App\Models\Clergy;
use App\Models\DocumentRequest;
use App\Models\Parish;
use App\Models\SacramentSchedule;
use App\Models\SacramentSetting;
use App\Models\ScheduleAttachment;
use App\Services\DocumentWorkflowService;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class PortalController extends Controller
{
    public function __construct(
        protected DocumentWorkflowService $workflowService
    ) {}

    /**
     * Show parishioner self-service dashboard.
     */
    public function dashboard(Request $request): Response
    {
        $user = $request->user();

        // Ensure any CertificateRequest belonging to this user has a synchronized DocumentRequest
        $unlinkedCerts = CertificateRequest::query()
            ->with(['record.person', 'record.originatingParish'])
            ->where('requester_user_id', $user->id)
            ->whereDoesntHave('linkedDocumentRequest')
            ->get();

        foreach ($unlinkedCerts as $cert) {
            $trackingCode = 'RCAL-REQ-'.strtoupper(Str::random(16));
            DocumentRequest::create([
                'tracking_code' => $trackingCode,
                'parishioner_id' => $user->id,
                'targeted_parish_id' => $cert->record?->originating_parish_id,
                'sacrament_type' => $cert->record?->sacrament_type ?? SacramentTypeEnum::BAPTISM,
                'name_on_record' => $cert->record?->person?->full_name ?? $cert->requester_name,
                'date_of_birth' => $cert->record?->person?->date_of_birth ?? now()->subYears(20)->toDateString(),
                'date_of_sacrament' => $cert->record?->event_date,
                'place_of_sacrament' => $cert->record?->originatingParish?->name,
                'relationship_to_owner' => 'Requester',
                'purpose' => $cert->purpose,
                'status' => $cert->status === RequestStatusEnum::ISSUED
                    ? DocumentRequestStatusEnum::COMPLETED
                    : ($cert->status === RequestStatusEnum::REJECTED
                        ? DocumentRequestStatusEnum::REJECTED
                        : DocumentRequestStatusEnum::PROCESSING),
                'matched_record_id' => $cert->record_id,
                'certificate_request_id' => $cert->id,
                'internal_note' => 'Staff-assisted filing initialized at parish office desk.',
                'consent_given_at' => now(),
                'consent_version' => '1.0',
            ]);
        }

        $documentRequests = DocumentRequest::query()
            ->with(['targetedParish', 'matchedRecord', 'certificateRequest'])
            ->where('parishioner_id', $user->id)
            ->orderByDesc('id')
            ->get();

        $schedules = SacramentSchedule::query()
            ->with(['parish', 'venue', 'presidingClergy', 'requestedClergy', 'attachments'])
            ->where('requester_user_id', $user->id)
            ->orderByDesc('starts_at')
            ->get();

        $metrics = [
            'total_claims' => $documentRequests->count(),
            'processing_claims' => $documentRequests->whereIn('status', [
                DocumentRequestStatusEnum::SUBMITTED,
                DocumentRequestStatusEnum::UNDER_REVIEW,
                DocumentRequestStatusEnum::PROCESSING,
            ])->count(),
            'ready_claims' => $documentRequests->where('status', DocumentRequestStatusEnum::READY)->count(),
            'completed_claims' => $documentRequests->where('status', DocumentRequestStatusEnum::COMPLETED)->count(),
            'upcoming_schedules' => $schedules->whereIn('status', ['requested', 'confirmed'])->count(),
        ];

        $sacramentCounts = [
            'baptism' => $documentRequests->filter(fn ($d) => ($d->sacrament_type instanceof SacramentTypeEnum ? $d->sacrament_type->value : (string) $d->sacrament_type) === 'baptism')->count(),
            'confirmation' => $documentRequests->filter(fn ($d) => ($d->sacrament_type instanceof SacramentTypeEnum ? $d->sacrament_type->value : (string) $d->sacrament_type) === 'confirmation')->count(),
            'marriage' => $documentRequests->filter(fn ($d) => ($d->sacrament_type instanceof SacramentTypeEnum ? $d->sacrament_type->value : (string) $d->sacrament_type) === 'marriage')->count(),
            'death' => $documentRequests->filter(fn ($d) => ($d->sacrament_type instanceof SacramentTypeEnum ? $d->sacrament_type->value : (string) $d->sacrament_type) === 'death')->count(),
        ];

        return Inertia::render('Portal/Dashboard', [
            'documentRequests' => $documentRequests,
            'schedules' => $schedules,
            'metrics' => $metrics,
            'sacramentCounts' => $sacramentCounts,
        ]);
    }

    /**
     * Show church certificate/record claim filing form (RA 10173 compliant).
     */
    public function createRequest(): Response
    {
        $parishes = Parish::query()
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name', 'city_municipality']);

        return Inertia::render('Portal/RequestCreate', [
            'parishes' => $parishes,
        ]);
    }

    /**
     * Process public document claim with mandatory Data Privacy consent.
     */
    public function storeRequest(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'targeted_parish_id' => ['nullable', 'integer', 'exists:parishes,id'],
            'sacrament_type' => ['required', 'string', 'in:baptism,confirmation,marriage,death'],
            'name_on_record' => ['required', 'string', 'max:255'],
            'date_of_birth' => ['required', 'date'],
            'date_of_sacrament' => ['nullable', 'date'],
            'place_of_sacrament' => ['nullable', 'string', 'max:255'],
            'parents_or_spouse' => ['nullable', 'string', 'max:255'],
            'relationship_to_owner' => ['required', 'string', 'max:100'],
            'purpose' => ['required', 'string', 'max:500'],
            'consent_given' => ['required', 'accepted'],
            'id_document' => ['nullable', 'file', 'mimes:jpg,jpeg,png,pdf', 'max:5120'],
        ]);

        $user = $request->user();

        if ($request->hasFile('id_document')) {
            $path = $request->file('id_document')->store('id_documents', 'local');
            $validated['id_document_path'] = $path;
        }

        $doc = $this->workflowService->fileDocumentRequest($validated, $user);

        return redirect()->route('portal.dashboard')
            ->with('success', "Your document claim has been filed successfully. Tracking Code: {$doc->tracking_code}");
    }

    /**
     * Show sacrament schedule request form.
     */
    public function createScheduleRequest(): Response
    {
        $parishes = Parish::query()
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name', 'city_municipality']);

        $clergy = Clergy::query()
            ->where('is_active', true)
            ->orderBy('last_name')
            ->get();

        $settings = SacramentSetting::query()
            ->where('is_available', true)
            ->get(['id', 'parish_id', 'sacrament_type', 'is_available', 'allowed_days', 'time_slots']);

        return Inertia::render('Portal/ScheduleRequestCreate', [
            'parishes' => $parishes,
            'clergy' => $clergy,
            'settings' => $settings,
        ]);
    }

    /**
     * Process sacrament schedule request and attachments.
     */
    public function storeScheduleRequest(Request $request): RedirectResponse
    {
        $isConfirmation = $request->input('sacrament_type') === 'confirmation';

        $validated = $request->validate([
            'requester_name' => ['required', 'string', 'max:160'],
            'requester_contact' => ['required', 'string', 'max:255'],
            'requester_email' => ['required', 'email', 'max:160'],
            'requester_relationship' => ['required', 'string', 'max:100'],
            'requester_address' => ['required', 'string'],
            'parish_id' => ['required', 'integer', 'exists:parishes,id'],
            'sacrament_type' => ['required', 'string'],
            'starts_at' => [$isConfirmation ? 'nullable' : 'required', 'date'],
            'alternative_starts_at' => ['nullable', 'date'],
            'requested_clergy_id' => ['nullable', 'integer', 'exists:clergy,id'],
            'certificate_submission_mode' => ['nullable', 'string', 'in:online,follow_up_office'],
            'specific_data' => ['nullable', 'array'],
        ]);

        // Validate allowed days for the selected parish and sacrament (if date is supplied)
        if (! empty($validated['starts_at'])) {
            $startsAt = Carbon::parse($validated['starts_at']);
            $dayOfWeek = strtolower($startsAt->englishDayOfWeek);
            $setting = SacramentSetting::where('parish_id', $validated['parish_id'])
                ->where('sacrament_type', $validated['sacrament_type'])
                ->first();

            if ($setting && ! empty($setting->allowed_days)) {
                $allowed = array_map('strtolower', $setting->allowed_days);
                if (! in_array($dayOfWeek, $allowed, true)) {
                    $daysFormatted = implode(', ', array_map('ucfirst', $setting->allowed_days));
                    throw ValidationException::withMessages([
                        'starts_at' => 'Scheduling for '.ucfirst($validated['sacrament_type'])." in this parish is only available on: {$daysFormatted}.",
                    ]);
                }
            }
        }

        $schedule = new SacramentSchedule;
        $schedule->requester_user_id = $request->user()->id;
        $schedule->parish_id = $validated['parish_id'];
        $schedule->sacrament_type = $validated['sacrament_type'];

        $isMatrimony = in_array($validated['sacrament_type'], ['matrimony', 'wedding'], true);

        if ($isMatrimony) {
            $groom = $validated['specific_data']['groom_name'] ?? 'Groom';
            $bride = $validated['specific_data']['bride_name'] ?? 'Bride';
            $schedule->title = "Matrimony Request - {$groom} & {$bride}";
            $schedule->certificate_submission_mode = 'follow_up_office';
        } else {
            $subjectName = $validated['specific_data']['candidate_name']
                ?? ($validated['specific_data']['child_name'] ?? $validated['requester_name']);
            $schedule->title = ucfirst($validated['sacrament_type']).' Request - '.$subjectName;
            $schedule->certificate_submission_mode = $validated['certificate_submission_mode'] ?? 'online';
        }

        if (! empty($validated['starts_at'])) {
            $schedule->starts_at = $validated['starts_at'];
            $schedule->ends_at = Carbon::parse($validated['starts_at'])->addHours(1);
        } else {
            $schedule->starts_at = null;
            $schedule->ends_at = null;
        }

        $schedule->alternative_starts_at = $validated['alternative_starts_at'] ?? null;
        $schedule->status = ScheduleStatusEnum::REQUESTED;

        $schedule->requester_name = $validated['requester_name'];
        $schedule->requester_contact = $validated['requester_contact'];
        $schedule->requester_email = $validated['requester_email'];
        $schedule->requester_relationship = $validated['requester_relationship'];
        $schedule->requester_address = $validated['requester_address'];
        $schedule->requested_clergy_id = $isConfirmation ? null : ($validated['requested_clergy_id'] ?? null);
        $schedule->specific_data = $validated['specific_data'] ?? [];
        $schedule->payment_status = 'unpaid';
        $schedule->save();

        // Handle file uploads (only if not matrimony / follow_up_office)
        if (! $isMatrimony) {
            $filesToUpload = [
                'gov_id',
                'psa_birth_cert',
                'cenomar',
                'prev_certificate',
                'confirmation_cert_godparents',
                'marriage_cert_parents',
                'baptismal_cert_father',
                'baptismal_cert_mother',
                'baptismal_cert_parents',
                'baptismal_cert_subject',
                'baptismal_permit',
                'confirmation_permit',
            ];

            foreach ($filesToUpload as $fileKey) {
                if ($request->hasFile($fileKey)) {
                    $path = $request->file($fileKey)->store('schedule_attachments', 'public');
                    ScheduleAttachment::create([
                        'sacrament_schedule_id' => $schedule->id,
                        'document_type' => $fileKey,
                        'file_path' => $path,
                    ]);
                }
            }
        }

        return redirect()->route('portal.dashboard')
            ->with('success', 'Your schedule request has been submitted for review.');
    }

    /**
     * Show the payment form for approved schedules.
     */
    public function paymentForm(Request $request, SacramentSchedule $schedule): Response
    {
        // Only allow if approved and belongs to user
        if ($schedule->requester_user_id !== $request->user()->id || $schedule->status->value !== 'confirmed') {
            abort(403, 'This request is not approved for payment yet.');
        }

        $schedule->load('attachments');

        return Inertia::render('Portal/SchedulePayment', [
            'schedule' => $schedule,
        ]);
    }

    /**
     * Submit payment details for the schedule.
     */
    public function submitPayment(Request $request, SacramentSchedule $schedule): RedirectResponse
    {
        if ($schedule->requester_user_id !== $request->user()->id || $schedule->status->value !== 'confirmed') {
            abort(403);
        }

        $validated = $request->validate([
            'payment_method' => ['required', 'string', 'in:cash,online'],
            'receipt' => ['required_if:payment_method,online', 'nullable', 'file', 'mimes:jpg,jpeg,png,pdf', 'max:5120'],
        ]);

        $schedule->payment_method = $validated['payment_method'];

        if ($validated['payment_method'] === 'online' && $request->hasFile('receipt')) {
            $path = $request->file('receipt')->store('schedule_receipts', 'local');
            $schedule->payment_receipt_path = $path;
            $schedule->payment_status = 'pending_verification';
        } else {
            $schedule->payment_status = 'pending_cash';
        }

        $schedule->save();

        return redirect()->back()
            ->with('payment_recorded', true)
            ->with('success', 'Your payment method has been successfully recorded.');
    }
}
