<?php

namespace App\Http\Controllers;

use App\Enums\AuditActionEnum;
use App\Http\Requests\CertificateTemplateStoreRequest;
use App\Models\CertificateTemplate;
use App\Models\Parish;
use App\Models\SacramentalRecord;
use App\Services\AuditService;
use App\Services\CertificateAutoPopulatorService;
use App\Services\CertificateFileParserService;
use App\Services\ParishScopingService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

/**
 * CertificateTemplateController – Manages Baptismal and Confirmation certificate templates.
 */
class CertificateTemplateController extends Controller
{
    public function __construct(
        protected CertificateFileParserService $parser,
        protected CertificateAutoPopulatorService $populator,
    ) {}

    /**
     * List certificate templates for Baptismal and Confirmation.
     */
    public function index(Request $request): Response
    {
        Gate::authorize('viewAny', CertificateTemplate::class);

        $user = $request->user();
        $parishId = $user->home_parish_id ?? Parish::first()?->id ?? 1;

        $this->ensureDefaultTemplates($parishId);

        $query = CertificateTemplate::query()->with('parish');

        if (! $user->isArchdioceseWide()) {
            $query->where('parish_id', $parishId);
        }

        $templates = $query->whereIn('sacrament_type', ['baptism', 'confirmation'])
            ->orderByRaw("CASE WHEN sacrament_type = 'baptism' THEN 1 ELSE 2 END")
            ->get();

        return Inertia::render('CertificateTemplates/Index', [
            'templates' => $templates,
        ]);
    }

    /**
     * Show upload/edit form for a template.
     */
    public function create(Request $request): Response
    {
        Gate::authorize('create', CertificateTemplate::class);

        $defaultSacrament = $request->query('sacrament_type', 'baptism');
        if (! in_array($defaultSacrament, ['baptism', 'confirmation'], true)) {
            $defaultSacrament = 'baptism';
        }

        return Inertia::render('CertificateTemplates/Create', [
            'defaultSacrament' => $defaultSacrament,
        ]);
    }

    /**
     * Store or update a template for either Baptismal or Confirmation.
     */
    public function store(CertificateTemplateStoreRequest $request): RedirectResponse
    {
        $validated = $request->validated();
        $user = $request->user();
        $parishId = $user->home_parish_id ?? Parish::first()?->id ?? 1;
        $sacramentType = $validated['sacrament_type'];

        $name = ! empty($validated['name'])
            ? $validated['name']
            : ($sacramentType === 'baptism' ? 'Baptismal Certificate' : 'Confirmation Certificate');

        // Look for existing template for this sacrament & parish
        $template = CertificateTemplate::where('parish_id', $parishId)
            ->where('sacrament_type', $sacramentType)
            ->first();

        $filename = $template?->filename ?? ($sacramentType === 'baptism' ? 'default_baptism.docx' : 'default_confirmation.docx');
        $allPlaceholders = $template?->placeholders ?? $this->defaultPlaceholders();

        // If a new file is uploaded, store and re-extract placeholders
        if ($request->hasFile('file')) {
            $file = $request->file('file');
            $newFilename = Str::uuid().'.'.$file->getClientOriginalExtension();
            $file->storeAs('templates', $newFilename);

            $autoPlaceholders = $this->parser->extractPlaceholders(
                Storage::path('templates/'.$newFilename)
            );

            $manualPlaceholders = $validated['placeholders'] ?? [];
            $allPlaceholders = array_values(array_unique(
                array_merge($this->defaultPlaceholders(), $autoPlaceholders, $manualPlaceholders)
            ));
            sort($allPlaceholders);

            $filename = $newFilename;
        }

        if ($template) {
            $template->update([
                'name' => $name,
                'filename' => $filename,
                'placeholders' => $allPlaceholders,
                'paper_size' => $validated['paper_size'] ?? $template->paper_size ?? 'short',
            ]);
            $action = AuditActionEnum::UPDATE;
            $msg = "Certificate template for {$sacramentType} updated by {$user->username}";
        } else {
            $template = CertificateTemplate::create([
                'name' => $name,
                'sacrament_type' => $sacramentType,
                'filename' => $filename,
                'placeholders' => $allPlaceholders,
                'paper_size' => $validated['paper_size'] ?? 'short',
                'parish_id' => $parishId,
            ]);
            $action = AuditActionEnum::CREATE;
            $msg = "Certificate template for {$sacramentType} created by {$user->username}";
        }

        AuditService::log($request, $action, 'certificate_template', $template->id, $msg);

        return redirect()->route('certificate-templates.index')
            ->with('success', "Template for \"{$template->name}\" saved successfully.");
    }

    /**
     * Show a template detail.
     */
    public function show(Request $request, CertificateTemplate $certificateTemplate): Response
    {
        Gate::authorize('view', $certificateTemplate);
        $certificateTemplate->load('parish');

        return Inertia::render('CertificateTemplates/Show', [
            'template' => $certificateTemplate,
        ]);
    }

    /**
     * Edit an existing template.
     */
    public function edit(Request $request, CertificateTemplate $certificateTemplate): Response
    {
        Gate::authorize('update', $certificateTemplate);
        $certificateTemplate->load('parish');

        return Inertia::render('CertificateTemplates/Edit', [
            'template' => $certificateTemplate,
        ]);
    }

    /**
     * Update an existing template.
     */
    public function update(Request $request, CertificateTemplate $certificateTemplate): RedirectResponse
    {
        Gate::authorize('update', $certificateTemplate);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'sacrament_type' => ['required', 'in:baptism,confirmation'],
            'file' => ['nullable', 'file', 'mimes:docx,pdf,png,jpg,jpeg', 'max:10240'],
            'paper_size' => ['required', 'in:short,a4'],
            'placeholders' => ['nullable', 'array'],
            'placeholders.*' => ['string', 'max:100'],
        ]);

        $user = $request->user();

        if ($request->hasFile('file')) {
            $file = $request->file('file');
            $filename = Str::uuid().'.'.$file->getClientOriginalExtension();
            $file->storeAs('templates', $filename);
            $certificateTemplate->filename = $filename;

            $autoPlaceholders = $this->parser->extractPlaceholders(
                Storage::path('templates/'.$filename)
            );
            $manualPlaceholders = $validated['placeholders'] ?? [];
            $allPlaceholders = array_values(array_unique(
                array_merge($this->defaultPlaceholders(), $autoPlaceholders, $manualPlaceholders)
            ));
            sort($allPlaceholders);
            $certificateTemplate->placeholders = $allPlaceholders;
        }

        $certificateTemplate->name = $validated['name'];
        $certificateTemplate->sacrament_type = $validated['sacrament_type'];
        $certificateTemplate->paper_size = $validated['paper_size'];
        $certificateTemplate->save();

        AuditService::log(
            $request,
            AuditActionEnum::UPDATE,
            'certificate_template',
            $certificateTemplate->id,
            "Certificate template '{$certificateTemplate->name}' updated by {$user->username}"
        );

        return redirect()->route('certificate-templates.index')
            ->with('success', "Template \"{$certificateTemplate->name}\" updated.");
    }

    /**
     * Delete a template.
     */
    public function destroy(Request $request, CertificateTemplate $certificateTemplate): RedirectResponse
    {
        Gate::authorize('delete', $certificateTemplate);

        $user = $request->user();
        $name = $certificateTemplate->name;
        $certificateTemplate->delete();

        AuditService::log(
            $request,
            AuditActionEnum::DELETE,
            'certificate_template',
            $certificateTemplate->id,
            "Certificate template '{$name}' deleted by {$user->username}"
        );

        return redirect()->route('certificate-templates.index')
            ->with('success', "Template \"{$name}\" deleted.");
    }

    /**
     * Preview and interactive certificate generator for Baptismal and Confirmation.
     */
    public function preview(Request $request, ?CertificateTemplate $certificateTemplate = null): Response
    {
        $user = $request->user();
        $parishId = $user->home_parish_id ?? Parish::first()?->id ?? 1;

        $this->ensureDefaultTemplates($parishId);

        // Requested sacrament type from query or route model
        $selectedSacrament = $request->query('sacrament_type', $certificateTemplate?->sacrament_type ?? 'baptism');
        if (! in_array($selectedSacrament, ['baptism', 'confirmation'], true)) {
            $selectedSacrament = 'baptism';
        }

        // Find active template for this sacrament
        $template = CertificateTemplate::where('parish_id', $parishId)
            ->where('sacrament_type', $selectedSacrament)
            ->first() ?? CertificateTemplate::where('sacrament_type', $selectedSacrament)->first();

        // Load records for dropdown matching this sacrament type
        $recordsQuery = SacramentalRecord::query()
            ->with(['person', 'originatingParish', 'performedByClergy'])
            ->where('sacrament_type', $selectedSacrament);

        if (! $user->isArchdioceseWide()) {
            $recordsQuery->where('originating_parish_id', $parishId);
        }

        $records = $recordsQuery->orderByDesc('event_date')->limit(100)->get();

        // Selected record for auto-population
        $selectedRecordId = $request->query('record_id');
        $populatedData = [];

        if ($selectedRecordId) {
            $record = SacramentalRecord::with(['person', 'originatingParish', 'performedByClergy'])
                ->find($selectedRecordId);

            if ($record && ParishScopingService::canViewRecord($user, $record)) {
                $populatedData = $this->populator->populate($record, $template?->placeholders ?? []);
            }
        }

        // If no record is selected, populate with sample placeholder values matching the church format
        if (empty($populatedData)) {
            $isBaptism = $selectedSacrament === 'baptism';
            $populatedData = [
                'recipient_name' => $isBaptism ? 'WESLYNN PIERRE P. ARQUINES' : 'JAMAICA J. ROGANDO',
                'parents' => $isBaptism ? 'Child of John Patrick Arquines & Lovely M. Parcon' : 'Child of Agosto M. Rogando & Jessica S. Japitana',
                'father_name' => $isBaptism ? 'John Patrick Arquines' : 'Agosto M. Rogando',
                'mother_name' => $isBaptism ? 'Lovely M. Parcon' : 'Jessica S. Japitana',
                'date_of_birth' => $isBaptism ? 'October 21, 2024' : 'September 2, 2004',
                'formatted_birth_date' => $isBaptism ? 'Born on the 21st day of October 2024' : 'Born on the 2nd day of September 2004',
                'place_of_birth' => $isBaptism ? 'In RMD Maternity Clinic Lipa City, Batangas' : 'In Mulawin Naujan, Oriental Mindoro',
                'sacrament_type' => $selectedSacrament,
                'sacrament_title' => $isBaptism ? 'Holy Sacrament of Baptism' : 'Holy Sacrament of Confirmation',
                'certificate_title' => $isBaptism ? 'CERTIFICATE OF BAPTISM' : 'CERTIFICATE OF CONFIRMATION',
                'event_date' => $isBaptism ? 'October 19, 2025' : 'October 11, 2025',
                'formatted_event_date' => $isBaptism ? 'On the 19th day of October, year of our Lord 2025' : '11th day of October, year of our Lord 2025',
                'minister_name' => $isBaptism ? 'Rev. Fr. Aren Bejasa, OSJ' : 'Fr. Dale Anthony Q. Barretto Ko',
                'parish_name' => 'St. Joseph the Worker Parish',
                'parish_address' => 'Inosluban Lipa City Batangas',
                'parish_email' => 'stjosephtheworker.rcal@gmail.com',
                'parish_contact' => '(043)-321-9447/ 0975-897-8022',
                'sponsors' => $isBaptism ? 'Red Jenn Lee T. Gasoc and Rosemarie D. Villena' : 'Pedro Manis and Laura Marasigan',
                'book_number' => '1',
                'page_number' => $isBaptism ? '89' : '50',
                'line_number' => $isBaptism ? '6' : '7',
                'citation' => $isBaptism ? 'Book 1 Page 89 Line 6' : 'Book 1 Page 50 Line 7',
                'clerk_name' => $isBaptism ? 'Elsie E. Balita' : 'Elsie Balita',
                'clerk_title' => 'Parish Clerk',
                'priest_name' => 'Rev. Fr. Dale Anthony Q. Barretto Ko',
                'priest_title' => 'Parish Priest',
                'issue_date' => now()->format('F j, Y'),
                'purpose' => 'FOR REFERENCE',
            ];
        }

        return Inertia::render('CertificateTemplates/Preview', [
            'template' => $template,
            'selectedSacrament' => $selectedSacrament,
            'records' => $records,
            'populatedData' => $populatedData,
            'selectedRecord' => $selectedRecordId ? (int) $selectedRecordId : null,
        ]);
    }

    /**
     * Generate action from preview.
     */
    public function generate(Request $request, CertificateTemplate $certificateTemplate): RedirectResponse
    {
        Gate::authorize('generate', $certificateTemplate);

        $validated = $request->validate([
            'record_id' => ['nullable', 'integer', 'exists:sacramental_records,id'],
            'sacrament_type' => ['nullable', 'in:baptism,confirmation'],
            'overrides' => ['nullable', 'array'],
        ]);

        $user = $request->user();

        AuditService::log(
            $request,
            AuditActionEnum::CREATE,
            'certificate_generation',
            $certificateTemplate->id,
            "Certificate generated for {$certificateTemplate->sacrament_type} by {$user->username}"
        );

        return redirect()->route('certificate-templates.preview', [
            'certificateTemplate' => $certificateTemplate->id,
            'sacrament_type' => $certificateTemplate->sacrament_type,
            'record_id' => $validated['record_id'] ?? null,
        ])->with('success', 'Certificate generated and ready for print/download.');
    }

    /**
     * Ensure default templates exist for baptism and confirmation.
     */
    protected function ensureDefaultTemplates(int $parishId): void
    {
        $types = [
            'baptism' => [
                'name' => 'Baptismal Certificate',
                'filename' => 'default_baptism.docx',
            ],
            'confirmation' => [
                'name' => 'Confirmation Certificate',
                'filename' => 'default_confirmation.docx',
            ],
        ];

        foreach ($types as $type => $info) {
            CertificateTemplate::firstOrCreate(
                [
                    'parish_id' => $parishId,
                    'sacrament_type' => $type,
                ],
                [
                    'name' => $info['name'],
                    'filename' => $info['filename'],
                    'placeholders' => $this->defaultPlaceholders(),
                    'paper_size' => 'short',
                ]
            );
        }
    }

    /**
     * Default list of placeholders for Catholic sacrament certificates.
     */
    protected function defaultPlaceholders(): array
    {
        return [
            'recipient_name',
            'parents',
            'father_name',
            'mother_name',
            'date_of_birth',
            'formatted_birth_date',
            'place_of_birth',
            'sacrament_type',
            'sacrament_title',
            'certificate_title',
            'event_date',
            'formatted_event_date',
            'minister_name',
            'parish_name',
            'parish_address',
            'parish_email',
            'parish_contact',
            'sponsors',
            'book_number',
            'page_number',
            'line_number',
            'citation',
            'clerk_name',
            'clerk_title',
            'priest_name',
            'priest_title',
            'issue_date',
            'purpose',
        ];
    }
}
