<?php

namespace App\Http\Controllers;

use App\Enums\SacramentTypeEnum;
use App\Models\CertificateRequest;
use App\Models\DocumentRequest;
use App\Models\Parish;
use App\Models\SacramentSchedule;
use App\Services\DocumentWorkflowService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
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
            $trackingCode = 'RCAL-REQ-' . strtoupper(Str::random(8));
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
                'status' => $cert->status === \App\Enums\RequestStatusEnum::ISSUED
                    ? \App\Enums\DocumentRequestStatusEnum::COMPLETED
                    : ($cert->status === \App\Enums\RequestStatusEnum::REJECTED
                        ? \App\Enums\DocumentRequestStatusEnum::REJECTED
                        : \App\Enums\DocumentRequestStatusEnum::PROCESSING),
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
            ->with(['parish', 'venue', 'presidingClergy'])
            ->where('requester_user_id', $user->id)
            ->orderByDesc('starts_at')
            ->get();

        return Inertia::render('Portal/Dashboard', [
            'documentRequests' => $documentRequests,
            'schedules' => $schedules,
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
            $path = $request->file('id_document')->store('id_documents', 'public');
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

        return Inertia::render('Portal/ScheduleRequestCreate', [
            'parishes' => $parishes,
        ]);
    }

    /**
     * Process sacrament schedule request and attachments.
     */
    public function storeScheduleRequest(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'requester_name' => ['required', 'string', 'max:160'],
            'requester_contact' => ['required', 'string', 'max:255'],
            'requester_email' => ['required', 'email', 'max:160'],
            'requester_relationship' => ['required', 'string', 'max:100'],
            'requester_address' => ['required', 'string'],
            'parish_id' => ['required', 'integer', 'exists:parishes,id'],
            'sacrament_type' => ['required', 'string'],
            'starts_at' => ['required', 'date'],
            'alternative_starts_at' => ['nullable', 'date'],
            'specific_data' => ['nullable', 'array'],
        ]);

        $schedule = new SacramentSchedule();
        $schedule->requester_user_id = $request->user()->id;
        $schedule->parish_id = $validated['parish_id'];
        $schedule->sacrament_type = $validated['sacrament_type'];
        $schedule->title = ucfirst($validated['sacrament_type']) . ' Request - ' . $validated['requester_name'];
        $schedule->starts_at = $validated['starts_at'];
        $schedule->ends_at = \Carbon\Carbon::parse($validated['starts_at'])->addHours(1);
        $schedule->alternative_starts_at = $validated['alternative_starts_at'] ?? null;
        $schedule->status = \App\Enums\ScheduleStatusEnum::REQUESTED;
        
        $schedule->requester_name = $validated['requester_name'];
        $schedule->requester_contact = $validated['requester_contact'];
        $schedule->requester_email = $validated['requester_email'];
        $schedule->requester_relationship = $validated['requester_relationship'];
        $schedule->requester_address = $validated['requester_address'];
        $schedule->specific_data = $validated['specific_data'] ?? [];
        $schedule->payment_status = 'unpaid';
        $schedule->save();

        // Handle file uploads
        $filesToUpload = ['gov_id', 'psa_birth_cert', 'cenomar', 'prev_certificate'];
        foreach ($filesToUpload as $fileKey) {
            if ($request->hasFile($fileKey)) {
                $path = $request->file($fileKey)->store('schedule_attachments', 'public');
                \App\Models\ScheduleAttachment::create([
                    'sacrament_schedule_id' => $schedule->id,
                    'document_type' => $fileKey,
                    'file_path' => $path,
                ]);
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
            $path = $request->file('receipt')->store('schedule_receipts', 'public');
            $schedule->payment_receipt_path = $path;
            $schedule->payment_status = 'paid';
        } else {
            $schedule->payment_status = 'pending_cash';
        }

        $schedule->save();

        return redirect()->back()
            ->with('payment_recorded', true)
            ->with('success', 'Your payment method has been successfully recorded.');
    }
}
