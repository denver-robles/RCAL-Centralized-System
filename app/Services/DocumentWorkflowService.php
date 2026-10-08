<?php

namespace App\Services;

use App\Enums\AuditActionEnum;
use App\Enums\DocumentRequestStatusEnum;
use App\Enums\RequestStatusEnum;
use App\Models\CertificateRequest;
use App\Models\DocumentRequest;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class DocumentWorkflowService
{
    /**
     * Generates the next sequential certificate number in the RCAL-YYYY-NNNN series.
     */
    public function generateCertificateNumber(): string
    {
        $year = date('Y');
        $prefix = "RCAL-{$year}-";

        $highest = CertificateRequest::where('certificate_number', 'like', "{$prefix}%")
            ->orderByDesc('certificate_number')
            ->value('certificate_number');

        $sequence = 1;
        if ($highest) {
            $parts = explode('-', $highest);
            $lastNum = (int) end($parts);
            $sequence = $lastNum + 1;
        }

        return sprintf('%s%04d', $prefix, $sequence);
    }

    /**
     * Generates a tamper-evident cryptographic verification token.
     */
    public function generateVerificationToken(string $certificateNumber, int $recordId): string
    {
        $payload = "RCAL-PIMS:{$certificateNumber}:{$recordId}:" . microtime(true);
        return hash_hmac('sha256', $payload, config('app.key'));
    }

    /**
     * Transition a certificate request with state machine guards.
     */
    public function transitionCertificate(
        CertificateRequest $request,
        RequestStatusEnum $targetStatus,
        User $actor,
        ?string $reason = null
    ): CertificateRequest {
        if (!$request->status->canTransitionTo($targetStatus)) {
            throw ValidationException::withMessages([
                'status' => "Cannot transition request from '{$request->status->label()}' to '{$targetStatus->label()}'.",
            ]);
        }

        if ($targetStatus === RequestStatusEnum::REJECTED && empty(trim((string)$reason))) {
            throw ValidationException::withMessages([
                'reason' => 'A rejection reason is strictly required.',
            ]);
        }

        return DB::transaction(function () use ($request, $targetStatus, $actor, $reason) {
            $oldStatus = $request->status;
            $now = now();

            $request->status = $targetStatus;

            match ($targetStatus) {
                RequestStatusEnum::VERIFIED => [
                    $request->verified_by_user_id = $actor->id,
                    $request->verified_at = $now,
                ],
                RequestStatusEnum::APPROVED => [
                    $request->approved_by_user_id = $actor->id,
                    $request->approved_at = $now,
                ],
                RequestStatusEnum::ISSUED => [
                    $request->issued_by_user_id = $actor->id,
                    $request->issued_at = $now,
                    $request->certificate_number = $request->certificate_number ?: $this->generateCertificateNumber(),
                    $request->verification_token = $this->generateVerificationToken($request->certificate_number, $request->record_id),
                ],
                RequestStatusEnum::REJECTED => [
                    $request->rejected_by_user_id = $actor->id,
                    $request->rejected_at = $now,
                    $request->rejection_reason = $reason,
                ],
                RequestStatusEnum::CANCELLED => [
                    $request->rejected_by_user_id = $actor->id,
                    $request->rejected_at = $now,
                    $request->rejection_reason = $reason ?: 'Cancelled by requester',
                ],
                default => null,
            };

            $request->save();

            // Synchronize linked DocumentRequest if present
            if ($request->linkedDocumentRequest) {
                $doc = $request->linkedDocumentRequest;
                if ($targetStatus === RequestStatusEnum::VERIFIED) {
                    $doc->update(['status' => DocumentRequestStatusEnum::UNDER_REVIEW]);
                } elseif ($targetStatus === RequestStatusEnum::APPROVED || $targetStatus === RequestStatusEnum::PROCESSING) {
                    $doc->update(['status' => DocumentRequestStatusEnum::PROCESSING]);
                } elseif ($targetStatus === RequestStatusEnum::READY) {
                    $doc->update(['status' => DocumentRequestStatusEnum::READY]);
                } elseif ($targetStatus === RequestStatusEnum::ISSUED) {
                    $doc->update(['status' => DocumentRequestStatusEnum::COMPLETED, 'issued_at' => $now]);
                } elseif ($targetStatus === RequestStatusEnum::REJECTED) {
                    $doc->update(['status' => DocumentRequestStatusEnum::REJECTED, 'rejection_reason' => $reason]);
                } elseif ($targetStatus === RequestStatusEnum::CANCELLED) {
                    $doc->update(['status' => DocumentRequestStatusEnum::CANCELLED, 'cancellation_reason' => $reason]);
                }
            }

            AuditService::record(
                AuditActionEnum::STATUS_CHANGE,
                $request,
                ['status' => $oldStatus->value],
                ['status' => $targetStatus->value],
                $reason ?: "Moved to {$targetStatus->label()}",
                $actor
            );

            return $request;
        });
    }

    /**
     * File a public portal claim for a church document.
     */
    public function fileDocumentRequest(array $data, User $parishioner): DocumentRequest
    {
        $trackingCode = 'RCAL-REQ-' . strtoupper(Str::random(8));

        return DB::transaction(function () use ($data, $parishioner, $trackingCode) {
            $doc = DocumentRequest::create([
                'tracking_code' => $trackingCode,
                'parishioner_id' => $parishioner->id,
                'targeted_parish_id' => $data['targeted_parish_id'] ?? null,
                'sacrament_type' => $data['sacrament_type'],
                'name_on_record' => $data['name_on_record'],
                'date_of_birth' => $data['date_of_birth'],
                'date_of_sacrament' => $data['date_of_sacrament'] ?? null,
                'place_of_sacrament' => $data['place_of_sacrament'] ?? null,
                'parents_or_spouse' => $data['parents_or_spouse'] ?? null,
                'relationship_to_owner' => $data['relationship_to_owner'] ?? 'Self',
                'purpose' => $data['purpose'] ?? null,
                'status' => DocumentRequestStatusEnum::SUBMITTED,
                'consent_given_at' => now(),
                'consent_version' => '1.0',
            ]);

            AuditService::record(
                AuditActionEnum::CREATE,
                $doc,
                null,
                ['tracking_code' => $doc->tracking_code, 'wants' => $doc->wantsDescription()],
                "Public document claim filed by {$parishioner->username}",
                $parishioner
            );

            return $doc;
        });
    }
}
