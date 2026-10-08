<?php

namespace Tests\Feature;

use App\Enums\AnnotationTypeEnum;
use App\Enums\RoleEnum;
use App\Enums\SacramentTypeEnum;
use App\Models\Parish;
use App\Models\SacramentalRecord;
use App\Models\User;
use App\Models\Vicariate;
use App\Services\Canon535Service;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class Can535ImmutabilityTest extends TestCase
{
    protected Parish $parish;
    protected User $staff;
    protected Canon535Service $service;

    protected function setUp(): void
    {
        parent::setUp();

        $vicariate = Vicariate::create(['name' => 'Central Vicariate']);
        $this->parish = Parish::create(['name' => 'St. Sebastian Cathedral', 'vicariate_id' => $vicariate->id, 'is_active' => true]);

        $this->staff = User::create([
            'username' => 'parish_scribe',
            'email' => 'scribe@rcal.ph',
            'role' => RoleEnum::PARISH_STAFF,
            'home_parish_id' => $this->parish->id,
            'password' => Hash::make('password'),
            'is_active' => true,
        ]);

        $this->service = app(Canon535Service::class);
    }

    public function test_transcription_creates_person_and_canonical_record(): void
    {
        $payload = [
            'originating_parish_id' => $this->parish->id,
            'sacrament_type' => 'baptism',
            'event_date' => '2023-05-15',
            'book_number' => 1,
            'page_number' => 10,
            'entry_number' => 2,
            'first_name' => 'Emmanuel',
            'last_name' => 'Reyes',
            'sex' => 'male',
            'father_name' => 'Antonio Reyes',
            'mother_name' => 'Clara Santos',
        ];

        $record = $this->service->transcribeRecord($payload, $this->staff);

        $this->assertNotNull($record->id);
        $this->assertEquals(1, $record->book_number);
        $this->assertEquals(10, $record->page_number);
        $this->assertEquals(2, $record->entry_number);
        $this->assertEquals('registered', $record->status);
        $this->assertEquals('Emmanuel Reyes', $record->person->full_name);
    }

    public function test_duplicate_citation_handle_is_strictly_rejected(): void
    {
        $payload = [
            'originating_parish_id' => $this->parish->id,
            'sacrament_type' => 'baptism',
            'event_date' => '2023-05-15',
            'book_number' => 1,
            'page_number' => 10,
            'entry_number' => 2,
            'first_name' => 'Emmanuel',
            'last_name' => 'Reyes',
            'sex' => 'male',
        ];

        $this->service->transcribeRecord($payload, $this->staff);

        // Attempt identical citation in same parish & sacrament
        $this->expectException(ValidationException::class);
        $this->service->transcribeRecord($payload, $this->staff);
    }

    public function test_inscribed_record_is_immutable_against_direct_updates(): void
    {
        $payload = [
            'originating_parish_id' => $this->parish->id,
            'sacrament_type' => 'baptism',
            'event_date' => '2023-05-15',
            'book_number' => 2,
            'page_number' => 1,
            'entry_number' => 1,
            'first_name' => 'Pedro',
            'last_name' => 'Santos',
            'sex' => 'male',
        ];

        $record = $this->service->transcribeRecord($payload, $this->staff);

        // Direct update should trigger exception due to Can. 535 immutability invariant
        $this->expectException(\DomainException::class);
        $record->update(['book_number' => 99]);
    }

    public function test_can_535_marginal_annotation_can_be_appended(): void
    {
        $payload = [
            'originating_parish_id' => $this->parish->id,
            'sacrament_type' => 'baptism',
            'event_date' => '2010-06-01',
            'book_number' => 3,
            'page_number' => 2,
            'entry_number' => 5,
            'first_name' => 'Ana',
            'last_name' => 'Bautista',
            'sex' => 'female',
        ];

        $record = $this->service->transcribeRecord($payload, $this->staff);

        $annotation = $this->service->addAnnotation(
            $record,
            AnnotationTypeEnum::CONFIRMATION,
            'Confirmed on 12 Dec 2022 at Lipa Cathedral',
            $this->staff
        );

        $this->assertNotNull($annotation->id);
        $this->assertEquals('annotated', $record->fresh()->status);
        $this->assertDatabaseHas('canonical_annotations', [
            'record_id' => $record->id,
            'annotation_type' => 'confirmation',
        ]);
    }

    public function test_void_entry_marks_status_voided_preserving_physical_row(): void
    {
        $payload = [
            'originating_parish_id' => $this->parish->id,
            'sacrament_type' => 'baptism',
            'event_date' => '2023-01-01',
            'book_number' => 4,
            'page_number' => 1,
            'entry_number' => 1,
            'first_name' => 'Test',
            'last_name' => 'Error',
            'sex' => 'male',
        ];

        $record = $this->service->transcribeRecord($payload, $this->staff);

        $this->service->voidEntry($record, 'Duplicate transcription made in error', $this->staff);

        $fresh = $record->fresh();
        $this->assertEquals('voided', $fresh->status);
        $this->assertNotNull($fresh); // Row is preserved
    }
}
