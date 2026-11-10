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
        $isBaptism = $request->input('sacrament_type') === 'baptism';
        $isConfirmation = $request->input('sacrament_type') === 'confirmation';
        $isMatrimony = in_array($request->input('sacrament_type'), ['matrimony', 'wedding'], true);
        $isFuneral = in_array($request->input('sacrament_type'), ['funeral', 'departed', 'mass_for_departed'], true);
        $isSponsoredMass = $request->input('sacrament_type') === 'sponsored_mass';
        $isBoneTransfer = in_array($request->input('sacrament_type'), ['bone_transfer', 'transfer_of_bones'], true);
        $isBlessing = $request->input('sacrament_type') === 'blessing';

        if ($request->input('requested_clergy_id') === 'other' || ! is_numeric($request->input('requested_clergy_id'))) {
            $request->merge(['requested_clergy_id' => null]);
        }

        $isCustomSacrament = $isBaptism || $isConfirmation || $isMatrimony || $isFuneral || $isSponsoredMass || $isBoneTransfer || $isBlessing;

        $validated = $request->validate([
            'requester_name' => [$isCustomSacrament ? 'nullable' : 'required', 'string', 'max:160'],
            'requester_contact' => ['required', 'string', 'max:255'],
            'requester_email' => [$isCustomSacrament ? 'nullable' : 'required', 'nullable', 'email', 'max:160'],
            'requester_relationship' => [$isCustomSacrament ? 'nullable' : 'required', 'string', 'max:100'],
            'requester_address' => [$isCustomSacrament ? 'nullable' : 'required', 'string'],
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

        $specificData = $validated['specific_data'] ?? [];

        if ($isMatrimony) {
            $groom = $specificData['groom_name'] ?? 'Groom';
            $bride = $specificData['bride_name'] ?? 'Bride';
            $schedule->title = "Matrimony Request - {$groom} & {$bride}";
            $schedule->certificate_submission_mode = 'follow_up_office';

            // Calculate or record amount from quotation if present
            $baseFee = (float) ($specificData['nuptial_base_fee'] ?? 7210);
            $addOns = $specificData['nuptial_add_ons'] ?? [];
            $addOnPrices = [
                'live_stream' => 500,
                'carpet' => 1500,
                'choir' => 1000,
                'flower_stand' => 500,
                'candle_pair' => 100,
            ];
            $computedAddOnsTotal = 0;
            if (is_array($addOns)) {
                foreach ($addOns as $k => $selected) {
                    if ($selected && isset($addOnPrices[$k])) {
                        $computedAddOnsTotal += $addOnPrices[$k];
                    }
                }
            }
            if (empty($specificData['amount'])) {
                $specificData['amount'] = $baseFee + $computedAddOnsTotal;
            }
            $specificData['nuptial_base_fee'] = $baseFee;
            $specificData['donation_amount'] = (float) $specificData['amount'];
            // Harmonize witnesses if godfather/godmother provided
            if (empty($specificData['witnesses'])) {
                $witnessList = array_filter([
                    ! empty($specificData['godfather_name']) ? $specificData['godfather_name'].' (Ninong)' : '',
                    ! empty($specificData['godmother_name']) ? $specificData['godmother_name'].' (Ninang)' : '',
                ]);
                if (! empty($witnessList)) {
                    $specificData['witnesses'] = implode(', ', $witnessList);
                }
            }
            // Auto derive DOB if age is present but DOB is missing
            if (empty($specificData['groom_dob']) && ! empty($specificData['groom_age'])) {
                $birthYear = (int) date('Y') - (int) $specificData['groom_age'];
                $specificData['groom_dob'] = "{$birthYear}-01-01";
            }
            if (empty($specificData['bride_dob']) && ! empty($specificData['bride_age'])) {
                $birthYear = (int) date('Y') - (int) $specificData['bride_age'];
                $specificData['bride_dob'] = "{$birthYear}-01-01";
            }
        } elseif ($isBaptism) {
            $subjectName = $specificData['child_name']
                ?? ($specificData['name_to_be_baptized'] ?? ($validated['requester_name'] ?? 'Candidate'));
            $schedule->title = 'Baptism Request - '.$subjectName;
            $schedule->certificate_submission_mode = $validated['certificate_submission_mode'] ?? 'follow_up_office';

            // Harmonize godparents composite and birthplace
            if (empty($specificData['godparents'])) {
                $gods = array_filter([
                    ! empty($specificData['godfather_name']) ? $specificData['godfather_name'].' (Ninong)' : '',
                    ! empty($specificData['godmother_name']) ? $specificData['godmother_name'].' (Ninang)' : '',
                ]);
                if (! empty($gods)) {
                    $specificData['godparents'] = implode(', ', $gods);
                }
            }
            if (empty($specificData['place_of_birth']) && ! empty($specificData['birthplace'])) {
                $specificData['place_of_birth'] = $specificData['birthplace'];
            }
            if (empty($specificData['birthplace']) && ! empty($specificData['place_of_birth'])) {
                $specificData['birthplace'] = $specificData['place_of_birth'];
            }
            if (empty($specificData['child_name']) && ! empty($specificData['name_to_be_baptized'])) {
                $specificData['child_name'] = $specificData['name_to_be_baptized'];
            }
            if (empty($specificData['parents_status']) && ! empty($specificData['parents_marital_status'])) {
                $specificData['parents_status'] = $specificData['parents_marital_status'];
            }
            if (empty($specificData['parents_marital_status']) && ! empty($specificData['parents_status'])) {
                $specificData['parents_marital_status'] = $specificData['parents_status'];
            }
        } elseif ($isConfirmation) {
            $subjectName = $specificData['child_name']
                ?? ($specificData['candidate_name'] ?? ($validated['requester_name'] ?? 'Candidate'));
            $schedule->title = 'Confirmation Request - '.$subjectName;
            $schedule->certificate_submission_mode = $validated['certificate_submission_mode'] ?? 'follow_up_office';

            // Harmonize godparents composite and aliases
            if (empty($specificData['godparents'])) {
                $gods = array_filter([
                    ! empty($specificData['godfather_name']) ? $specificData['godfather_name'].' (Ninong)' : '',
                    ! empty($specificData['godmother_name']) ? $specificData['godmother_name'].' (Ninang)' : '',
                ]);
                if (! empty($gods)) {
                    $specificData['godparents'] = implode(', ', $gods);
                }
            }
            if (empty($specificData['godparent_name']) && ! empty($specificData['godparents'])) {
                $specificData['godparent_name'] = $specificData['godparents'];
            }
            if (empty($specificData['candidate_name']) && ! empty($specificData['child_name'])) {
                $specificData['candidate_name'] = $specificData['child_name'];
            }
            if (empty($specificData['child_name']) && ! empty($specificData['candidate_name'])) {
                $specificData['child_name'] = $specificData['candidate_name'];
            }
            if (empty($specificData['candidate_dob']) && ! empty($specificData['dob'])) {
                $specificData['candidate_dob'] = $specificData['dob'];
            }
            if (empty($specificData['dob']) && ! empty($specificData['candidate_dob'])) {
                $specificData['dob'] = $specificData['candidate_dob'];
            }
            if (empty($specificData['candidate_address']) && ! empty($specificData['address'])) {
                $specificData['candidate_address'] = $specificData['address'];
            }
            if (empty($specificData['address']) && ! empty($specificData['candidate_address'])) {
                $specificData['address'] = $specificData['candidate_address'];
            }
            if (empty($specificData['candidate_father_name']) && ! empty($specificData['father_name'])) {
                $specificData['candidate_father_name'] = $specificData['father_name'];
            }
            if (empty($specificData['father_name']) && ! empty($specificData['candidate_father_name'])) {
                $specificData['father_name'] = $specificData['candidate_father_name'];
            }
            if (empty($specificData['candidate_mother_name']) && ! empty($specificData['mother_name'])) {
                $specificData['candidate_mother_name'] = $specificData['mother_name'];
            }
            if (empty($specificData['mother_name']) && ! empty($specificData['candidate_mother_name'])) {
                $specificData['mother_name'] = $specificData['candidate_mother_name'];
            }
            if (empty($specificData['baptism_parish']) && ! empty($specificData['place_of_baptism'])) {
                $specificData['baptism_parish'] = $specificData['place_of_baptism'];
            }
            if (empty($specificData['place_of_baptism']) && ! empty($specificData['baptism_parish'])) {
                $specificData['place_of_baptism'] = $specificData['baptism_parish'];
            }
            if (empty($specificData['baptism_date']) && ! empty($specificData['date_baptized'])) {
                $specificData['baptism_date'] = $specificData['date_baptized'];
            }
            if (empty($specificData['date_baptized']) && ! empty($specificData['baptism_date'])) {
                $specificData['date_baptized'] = $specificData['baptism_date'];
            }
        } elseif ($isFuneral) {
            $deceased = $specificData['deceased_name'] ?? 'Departed';
            $isMass = ! empty($specificData['service_mass']);
            $isBlessingService = ! empty($specificData['service_blessing']);
            $serviceType = ($isMass && $isBlessingService) ? 'Mass & Blessing' : ($isBlessingService ? 'Blessing' : 'Mass');
            $schedule->title = "{$serviceType} for Departed - {$deceased}";
            $schedule->certificate_submission_mode = 'follow_up_office';
        } elseif ($isSponsoredMass) {
            $intentions = [];
            if (! empty($specificData['sponsored_thanksgiving'])) {
                $intentions[] = 'Thanksgiving'.(! empty($specificData['sponsored_thanksgiving_of']) ? ' ('.$specificData['sponsored_thanksgiving_of'].')' : '');
            }
            if (! empty($specificData['sponsored_wedding_anniversary'])) {
                $intentions[] = 'Wedding Anniversary'.(! empty($specificData['sponsored_wedding_anniversary_of']) ? ' ('.$specificData['sponsored_wedding_anniversary_of'].')' : '');
            }
            if (! empty($specificData['sponsored_birthday'])) {
                $intentions[] = 'Birthday'.(! empty($specificData['sponsored_birthday_of']) ? ' ('.$specificData['sponsored_birthday_of'].')' : '');
            }
            $intentionStr = ! empty($intentions) ? implode(', ', $intentions) : 'Mass Intention';
            $rep = ! empty($validated['requester_name']) ? $validated['requester_name'] : ($specificData['representative_name'] ?? ($request->user()?->name ?? 'Representative'));
            $schedule->title = "Sponsored Mass ({$intentionStr}) - {$rep}";
            $schedule->certificate_submission_mode = 'follow_up_office';

            $basePrice = 2000;
            $hasLivestream = ! empty($specificData['sponsored_livestream']) || ! empty($specificData['livestream']);
            $hasChoir = ! empty($specificData['sponsored_choir']) || ! empty($specificData['choir']);
            $computedTotal = $basePrice + ($hasLivestream ? 500 : 0) + ($hasChoir ? 1000 : 0);
            $specificData['sponsored_base_fee'] = $basePrice;
            $specificData['amount'] = (float) ($specificData['amount'] ?? $computedTotal);
            $specificData['donation_amount'] = (float) $specificData['amount'];
        } elseif ($isBoneTransfer) {
            $deceased = $specificData['deceased_name'] ?? 'Deceased';
            $rep = ! empty($validated['requester_name']) ? $validated['requester_name'] : ($specificData['representative_name'] ?? ($request->user()?->name ?? 'Representative'));
            $schedule->title = "Bone / Ash Transfer - {$deceased} (Rep: {$rep})";
            $schedule->certificate_submission_mode = 'follow_up_office';
            $specificData['amount'] = (float) ($specificData['amount'] ?? 100);
            $specificData['donation_amount'] = (float) $specificData['amount'];
        } elseif ($isBlessing) {
            $category = $specificData['blessing_category'] ?? 'Blessing';
            $rep = ! empty($validated['requester_name']) ? $validated['requester_name'] : ($request->user()?->name ?? 'Parishioner');
            $schedule->title = "Blessing - {$category} ({$rep})";
            $schedule->certificate_submission_mode = 'follow_up_office';
            $specificData['amount'] = (float) ($specificData['amount'] ?? 100);
            $specificData['donation_amount'] = (float) $specificData['amount'];
        } else {
            $subjectName = $specificData['candidate_name']
                ?? ($specificData['child_name'] ?? $validated['requester_name']);
            $schedule->title = ucfirst($validated['sacrament_type']).' Request - '.$subjectName;
            $schedule->certificate_submission_mode = $validated['certificate_submission_mode'] ?? 'follow_up_office';
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

        if ($isBaptism) {
            $schedule->requester_name = ! empty($validated['requester_name'])
                ? $validated['requester_name']
                : ($request->user()?->name ?? ($specificData['child_name'] ?? 'Parishioner'));
            $schedule->requester_email = ! empty($validated['requester_email'])
                ? $validated['requester_email']
                : ($request->user()?->email ?? 'parishioner@rcal.ph');
            $schedule->requester_relationship = ! empty($validated['requester_relationship'])
                ? $validated['requester_relationship']
                : 'Parent / Applicant';
            $parentAddress = ! empty($specificData['father_address'])
                ? $specificData['father_address']
                : (! empty($specificData['mother_address']) ? $specificData['mother_address'] : 'Parish Jurisdiction');

            $schedule->requester_address = ! empty($validated['requester_address'])
                ? $validated['requester_address']
                : $parentAddress;
        } elseif ($isConfirmation) {
            $parentName = ! empty($validated['requester_name'])
                ? $validated['requester_name']
                : (! empty($specificData['father_name'])
                    ? $specificData['father_name']
                    : (! empty($specificData['mother_name']) ? $specificData['mother_name'] : ($request->user()?->name ?? 'Parent / Guardian')));
            $schedule->requester_name = $parentName;
            $schedule->requester_email = ! empty($validated['requester_email'])
                ? $validated['requester_email']
                : ($request->user()?->email ?? 'parishioner@rcal.ph');
            $schedule->requester_relationship = ! empty($validated['requester_relationship'])
                ? $validated['requester_relationship']
                : 'Parent / Guardian';
            $subjectAddress = ! empty($specificData['address'])
                ? $specificData['address']
                : (! empty($specificData['candidate_address']) ? $specificData['candidate_address'] : null);
            $sponsorAddress = ! empty($validated['requester_address'])
                ? $validated['requester_address']
                : ($subjectAddress ?? (! empty($specificData['godfather_address'])
                    ? $specificData['godfather_address']
                    : (! empty($specificData['godmother_address']) ? $specificData['godmother_address'] : 'Parish Jurisdiction')));
            $schedule->requester_address = $sponsorAddress;
        } elseif ($isMatrimony) {
            $schedule->requester_name = ! empty($validated['requester_name'])
                ? $validated['requester_name']
                : ($specificData['groom_name'] ?? ($specificData['bride_name'] ?? ($request->user()?->name ?? 'Groom / Bride')));
            $schedule->requester_email = ! empty($validated['requester_email'])
                ? $validated['requester_email']
                : ($request->user()?->email ?? 'parishioner@rcal.ph');
            $schedule->requester_relationship = ! empty($validated['requester_relationship'])
                ? $validated['requester_relationship']
                : 'Groom';
            $coupleAddress = ! empty($specificData['groom_address'])
                ? $specificData['groom_address']
                : (! empty($specificData['bride_address']) ? $specificData['bride_address'] : 'Parish Jurisdiction');
            $schedule->requester_address = ! empty($validated['requester_address'])
                ? $validated['requester_address']
                : $coupleAddress;
        } elseif ($isFuneral) {
            $schedule->requester_name = ! empty($validated['requester_name'])
                ? $validated['requester_name']
                : ($specificData['informant_name'] ?? ($request->user()?->name ?? 'Family Representative'));
            $schedule->requester_email = ! empty($validated['requester_email'])
                ? $validated['requester_email']
                : ($request->user()?->email ?? 'parishioner@rcal.ph');
            $schedule->requester_relationship = ! empty($validated['requester_relationship'])
                ? $validated['requester_relationship']
                : 'Family Representative';
            $schedule->requester_address = ! empty($validated['requester_address'])
                ? $validated['requester_address']
                : ($specificData['deceased_address'] ?? 'Parish Jurisdiction');
        } elseif ($isSponsoredMass) {
            $rep = ! empty($validated['requester_name'])
                ? $validated['requester_name']
                : ($specificData['representative_name'] ?? ($request->user()?->name ?? 'Representative'));
            $schedule->requester_name = $rep;
            $schedule->requester_email = ! empty($validated['requester_email'])
                ? $validated['requester_email']
                : ($request->user()?->email ?? 'parishioner@rcal.ph');
            $schedule->requester_relationship = ! empty($validated['requester_relationship'])
                ? $validated['requester_relationship']
                : 'Representative';
            $schedule->requester_address = ! empty($validated['requester_address'])
                ? $validated['requester_address']
                : ($specificData['representative_address'] ?? ($specificData['address'] ?? 'Parish Jurisdiction'));
        } elseif ($isBoneTransfer) {
            $rep = ! empty($validated['requester_name'])
                ? $validated['requester_name']
                : ($specificData['representative_name'] ?? ($request->user()?->name ?? 'Representative'));
            $schedule->requester_name = $rep;
            $schedule->requester_email = ! empty($validated['requester_email'])
                ? $validated['requester_email']
                : ($request->user()?->email ?? 'parishioner@rcal.ph');
            $schedule->requester_relationship = ! empty($validated['requester_relationship'])
                ? $validated['requester_relationship']
                : 'Representative';
            $schedule->requester_address = ! empty($validated['requester_address'])
                ? $validated['requester_address']
                : ($specificData['representative_address'] ?? ($specificData['deceased_address'] ?? 'Parish Jurisdiction'));
        } elseif ($isBlessing) {
            $rep = ! empty($validated['requester_name'])
                ? $validated['requester_name']
                : ($request->user()?->name ?? 'Parishioner');
            $schedule->requester_name = $rep;
            $schedule->requester_email = ! empty($validated['requester_email'])
                ? $validated['requester_email']
                : ($request->user()?->email ?? 'parishioner@rcal.ph');
            $schedule->requester_relationship = ! empty($validated['requester_relationship'])
                ? $validated['requester_relationship']
                : 'Applicant';
            $schedule->requester_address = ! empty($validated['requester_address'])
                ? $validated['requester_address']
                : ($specificData['complete_address'] ?? 'Parish Jurisdiction');
        } else {
            $schedule->requester_name = $validated['requester_name'];
            $schedule->requester_email = $validated['requester_email'];
            $schedule->requester_relationship = $validated['requester_relationship'];
            $schedule->requester_address = $validated['requester_address'];
        }

        $schedule->requester_contact = $validated['requester_contact'];
        $schedule->requested_clergy_id = ! empty($validated['requested_clergy_id']) ? (int) $validated['requested_clergy_id'] : null;
        $schedule->specific_data = $specificData;
        $schedule->payment_status = 'unpaid';
        $schedule->save();

        // Handle file uploads (only if not matrimony / funeral / sponsored_mass / bone_transfer / follow_up_office)
        if (! $isMatrimony && ! $isFuneral && ! $isSponsoredMass && ! $isBoneTransfer && ($schedule->certificate_submission_mode !== 'follow_up_office')) {
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
