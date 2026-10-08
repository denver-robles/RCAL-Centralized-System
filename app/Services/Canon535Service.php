<?php

namespace App\Services;

use App\Enums\AnnotationTypeEnum;
use App\Enums\AuditActionEnum;
use App\Enums\LegitimacyStatusEnum;
use App\Enums\SacramentTypeEnum;
use App\Models\CanonicalAnnotation;
use App\Models\Person;
use App\Models\SacramentalRecord;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class Canon535Service
{
    /**
     * Transcribe a new canonical register entry (Can. 535 §1).
     * Once inscribed, the entry is immutable.
     */
    public function transcribeRecord(array $data, User $clerk): SacramentalRecord
    {
        // Guard: Staff may only transcribe into their assigned parish
        if (!$clerk->isArchdioceseWide() && (int)$data['originating_parish_id'] !== (int)$clerk->home_parish_id) {
            throw ValidationException::withMessages([
                'originating_parish_id' => 'Your account may only transcribe into its own parish\'s registers.',
            ]);
        }

        return DB::transaction(function () use ($data, $clerk) {
            // Check legal citation uniqueness
            $exists = SacramentalRecord::where([
                'originating_parish_id' => $data['originating_parish_id'],
                'sacrament_type' => $data['sacrament_type'],
                'book_number' => $data['book_number'],
                'page_number' => $data['page_number'],
                'entry_number' => $data['entry_number'],
            ])->exists();

            if ($exists) {
                throw ValidationException::withMessages([
                    'entry_number' => "Citation Book {$data['book_number']}, Page {$data['page_number']}, Entry {$data['entry_number']} is already occupied in this register.",
                ]);
            }

            // Inscribe Subject Person
            $person = Person::create([
                'first_name' => $data['first_name'],
                'middle_name' => $data['middle_name'] ?? null,
                'last_name' => $data['last_name'],
                'suffix' => $data['suffix'] ?? null,
                'sex' => $data['sex'],
                'date_of_birth' => $data['date_of_birth'] ?? null,
                'place_of_birth' => $data['place_of_birth'] ?? null,
                'father_name' => $data['father_name'] ?? null,
                'mother_name' => $data['mother_name'] ?? null,
            ]);

            // Inscribe Spouse if Marriage register
            $spouseId = null;
            if ($data['sacrament_type'] === SacramentTypeEnum::MARRIAGE->value || $data['sacrament_type'] === 'marriage') {
                if (!empty($data['spouse_first_name']) && !empty($data['spouse_last_name'])) {
                    $spouse = Person::create([
                        'first_name' => $data['spouse_first_name'],
                        'last_name' => $data['spouse_last_name'],
                        'sex' => ($data['sex'] === 'male') ? 'female' : 'male',
                    ]);
                    $spouseId = $spouse->id;
                }
            }

            $record = SacramentalRecord::create([
                'person_id' => $person->id,
                'spouse_person_id' => $spouseId,
                'sacrament_type' => $data['sacrament_type'],
                'event_date' => $data['event_date'],
                'book_number' => $data['book_number'],
                'page_number' => $data['page_number'],
                'entry_number' => $data['entry_number'],
                'originating_parish_id' => $data['originating_parish_id'],
                'performed_by_clergy_id' => $data['performed_by_clergy_id'] ?? null,
                'legitimacy' => $data['legitimacy'] ?? null,
                'godparents' => $data['godparents'] ?? null,
                'witnesses' => $data['witnesses'] ?? null,
                'place_of_event' => $data['place_of_event'] ?? null,
                'register_notes' => $data['register_notes'] ?? null,
                'status' => 'registered',
            ]);

            // Audit inscription
            AuditService::record(
                AuditActionEnum::CREATE,
                $record,
                null,
                [
                    'citation' => $record->citation,
                    'sacrament_type' => $record->sacrament_type->value,
                    'person' => $person->full_name,
                    'parish_id' => $record->originating_parish_id,
                ],
                "Canonical inscription transcribed by {$clerk->username}",
                $clerk
            );

            return $record;
        });
    }

    /**
     * Inscribe a marginal annotation (Can. 535 §2).
     * The original record remains unchanged.
     */
    public function addAnnotation(
        SacramentalRecord $record,
        AnnotationTypeEnum $type,
        string $text,
        User $clerk,
        ?string $eventDate = null,
        ?string $decreeReference = null,
        ?int $referenceRecordId = null
    ): CanonicalAnnotation {
        return DB::transaction(function () use ($record, $type, $text, $clerk, $eventDate, $decreeReference, $referenceRecordId) {
            $annotation = $record->addAnnotation(
                $type,
                $text,
                $clerk->id,
                $eventDate,
                $decreeReference,
                $referenceRecordId
            );

            // Mark record status as annotated if currently registered
            if ($record->status === 'registered') {
                $record->forceFill(['status' => 'annotated'])->saveQuietly();
            }

            AuditService::record(
                AuditActionEnum::ANNOTATE,
                $record,
                null,
                [
                    'annotation_id' => $annotation->id,
                    'type' => $type->value,
                    'note_text' => $text,
                    'reference_record_id' => $referenceRecordId,
                ],
                "Margin note ({$type->label()}) added by {$clerk->username}",
                $clerk
            );

            return $annotation;
        });
    }

    /**
     * Voids an entry transcribed in error while preserving the physical row in the register.
     */
    public function voidEntry(SacramentalRecord $record, string $reason, User $clerk): void
    {
        if (!$clerk->isArchdioceseWide() && $clerk->home_parish_id !== $record->originating_parish_id) {
            throw ValidationException::withMessages([
                'void' => 'Unauthorized to void records from other parishes.',
            ]);
        }

        $oldStatus = $record->status;
        $record->forceFill([
            'status' => 'voided',
            'voided_reason' => $reason,
        ])->saveQuietly();

        AuditService::record(
            AuditActionEnum::STATUS_CHANGE,
            $record,
            ['status' => $oldStatus],
            ['status' => 'voided', 'reason' => $reason],
            "Record #{$record->id} voided: {$reason}",
            $clerk
        );
    }
}
