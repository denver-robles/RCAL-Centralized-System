<?php

namespace App\Http\Controllers;

use App\Enums\AuditActionEnum;
use App\Enums\ClergyTitleEnum;
use App\Models\Clergy;
use App\Models\ClergyAssignment;
use App\Models\Parish;
use App\Services\AuditService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ClergyController extends Controller
{
    /**
     * Display the Archdiocesan Clergy Directory.
     */
    public function index(Request $request): Response
    {
        $search = trim((string) $request->query('search', ''));
        $title = $request->query('title', 'all');

        $query = Clergy::query()->with(['assignments.parish']);

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('first_name', 'like', "%{$search}%")
                  ->orWhere('last_name', 'like', "%{$search}%")
                  ->orWhere('middle_name', 'like', "%{$search}%");
            });
        }

        if ($title !== 'all') {
            $query->where('title', $title);
        }

        $clergy = $query->orderBy('last_name')->paginate(20)->withQueryString();

        $parishes = Parish::where('is_active', true)->orderBy('name')->get(['id', 'name', 'city_municipality']);

        return Inertia::render('Clergy/Index', [
            'clergy' => $clergy,
            'parishes' => $parishes,
            'filters' => [
                'search' => $search,
                'title' => $title,
            ],
        ]);
    }

    /**
     * Inscribe a new ordained minister into the Clergy Directory.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'first_name' => ['required', 'string', 'max:100'],
            'middle_name' => ['nullable', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],
            'suffix' => ['nullable', 'string', 'in:Jr.,Sr.,II,III,IV,V,VI'],
            'title' => ['required', 'string', 'in:archbishop,bishop,monsignor,father,deacon'],
            'ordination_date' => ['nullable', 'date'],
            'date_of_birth' => ['nullable', 'date'],
            'status' => ['nullable', 'string', 'max:50'],
            'parish_id' => ['nullable', 'integer', 'exists:parishes,id'],
            'assignment_role' => ['nullable', 'string', 'max:100'],
        ], [
            'suffix.in' => 'Suffix must be one of: Jr., Sr., II, III, IV, V, VI.',
            'title.in' => 'Please select a valid ecclesiastical title.',
        ]);

        $user = $request->user();

        $clergy = Clergy::create([
            'first_name' => trim($validated['first_name']),
            'middle_name' => !empty($validated['middle_name']) ? trim($validated['middle_name']) : null,
            'last_name' => trim($validated['last_name']),
            'suffix' => !empty($validated['suffix']) ? $validated['suffix'] : null,
            'title' => ClergyTitleEnum::from($validated['title']),
            'ordination_date' => $validated['ordination_date'] ?? null,
            'date_of_birth' => $validated['date_of_birth'] ?? null,
            'status' => $validated['status'] ?? 'Active Ministry',
            'is_active' => true,
        ]);

        if (!empty($validated['parish_id'])) {
            ClergyAssignment::create([
                'clergy_id' => $clergy->id,
                'parish_id' => $validated['parish_id'],
                'role' => $validated['assignment_role'] ?? 'parish_priest',
                'assigned_from' => now()->toDateString(),
            ]);
        }

        AuditService::log(
            $request,
            AuditActionEnum::CREATE,
            'clergy',
            $clergy->id,
            "New clergy member registered: {$clergy->titled_name} by {$user->username}"
        );

        return redirect()->route('clergy.index')
            ->with('success', "Rev. {$clergy->full_name} added to the Archdiocesan Clergy Directory.");
    }
}
