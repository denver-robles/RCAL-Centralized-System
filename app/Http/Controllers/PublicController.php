<?php

namespace App\Http\Controllers;

use App\Models\CertificateRequest;
use App\Models\DocumentRequest;
use App\Models\Parish;
use App\Models\SacramentalRecord;
use App\Models\Vicariate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PublicController extends Controller
{
    /**
     * Show public landing page with archdiocesan portal metrics and simulator.
     */
    public function index(): Response
    {
        $parishesCount = Parish::query()->where('is_active', true)->count();
        $recordsCount = SacramentalRecord::query()->where('status', '!=', 'voided')->count();
        $issuedCertificatesCount = CertificateRequest::query()->where('status', 'issued')->count();
        $vicariatesCount = Vicariate::query()->count();
        $clergyCount = \App\Models\Clergy::query()->where('is_active', true)->count();

        $stats = [
            'parishes' => $parishesCount ?: 9,
            'records' => $recordsCount ?: 13,
            'vicariates' => $vicariatesCount ?: 3,
            'clergy' => $clergyCount ?: 8,
            'municipalities' => 34,
            'priests' => $clergyCount ?: 8,
            'persons' => \App\Models\Person::query()->count() ?: 12,
        ];

        return Inertia::render('Public/Index', [
            'stats' => $stats,
            'metrics' => [
                'parishes_count' => $parishesCount,
                'records_count' => $recordsCount,
                'issued_certificates_count' => $issuedCertificatesCount,
                'vicariates_count' => $vicariatesCount,
            ],
        ]);
    }

    /**
     * Mask full name for RA 10173 compliance to prevent brute-force identity enumeration.
     */
    private function maskName(?string $name): string
    {
        if (!$name) {
            return '';
        }

        $parts = preg_split('/\s+/', trim($name));
        $masked = array_map(function ($part) {
            $len = mb_strlen($part);
            if ($len <= 1) {
                return $part;
            }
            return mb_substr($part, 0, 1) . str_repeat('*', min(4, max(2, $len - 1)));
        }, $parts);

        return implode(' ', $masked);
    }

    /**
     * Public tracking query endpoint for parishioners to check claim progress.
     */
    public function track(Request $request): JsonResponse
    {
        $code = trim((string) $request->query('code', ''));

        if (!$code) {
            return response()->json(['error' => 'Tracking code is required.'], 422);
        }

        $documentRequest = DocumentRequest::query()
            ->with(['targetedParish:id,name,municipality'])
            ->where('tracking_code', $code)
            ->first();

        if (!$documentRequest) {
            return response()->json(['error' => 'No request found matching the specified tracking code.'], 404);
        }

        return response()->json([
            'tracking_code' => $documentRequest->tracking_code,
            'status' => $documentRequest->status->value,
            'sacrament_type' => $documentRequest->sacrament_type->value,
            'name_on_record' => $this->maskName($documentRequest->name_on_record),
            'parish_name' => $documentRequest->targetedParish?->name ?? 'Archdiocesan Curia Chancery',
            'submitted_at' => $documentRequest->created_at->toIso8601String(),
            'issued_at' => $documentRequest->issued_at?->toIso8601String(),
        ]);
    }

    /**
     * Public cryptographic certificate verification endpoint.
     */
    public function verifyCertificate(Request $request, string $token): JsonResponse|Response
    {
        $cert = CertificateRequest::query()
            ->with(['record.person', 'record.originatingParish'])
            ->where('verification_token', $token)
            ->where('status', 'issued')
            ->first();

        $data = null;
        if ($cert && $cert->record) {
            $data = [
                'valid' => true,
                'certificate_number' => $cert->certificate_number,
                'sacrament' => ucfirst($cert->record->sacrament_type->value ?? (string) $cert->record->sacrament_type),
                'recipient_name' => $this->maskName($cert->record->person?->full_name),
                'parish' => $cert->record->originatingParish?->name,
                'event_date' => $cert->record->event_date?->format('F j, Y'),
                'citation' => $cert->record->citation,
                'issued_at' => $cert->issued_at?->toIso8601String(),
            ];
        }

        if ($request->wantsJson()) {
            if (!$data) {
                return response()->json([
                    'valid' => false,
                    'message' => 'Invalid or unrecognized Archdiocesan certificate verification token.',
                ], 404);
            }

            return response()->json($data);
        }

        return Inertia::render('Public/Verify', [
            'valid' => (bool) $data,
            'certificate' => $data,
            'token' => $token,
        ]);
    }
}
