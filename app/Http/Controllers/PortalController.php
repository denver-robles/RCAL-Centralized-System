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
}
