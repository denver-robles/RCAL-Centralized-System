<?php

namespace Tests\Feature;

use App\Enums\RequestStatusEnum;
use App\Enums\RoleEnum;
use App\Enums\SacramentTypeEnum;
use App\Models\CertificateRequest;
use App\Models\DocumentRequest;
use App\Models\Parish;
use App\Models\Person;
use App\Models\SacramentalRecord;
use App\Models\User;
use App\Models\Vicariate;
use App\Services\DocumentWorkflowService;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class CertificateWorkflowTest extends TestCase
{
    protected Parish $parish;
    protected User $pastor;
    protected User $clerk;
    protected SacramentalRecord $record;
    protected DocumentWorkflowService $workflow;

    protected function setUp(): void
    {
        parent::setUp();

        $vicariate = Vicariate::create(['name' => 'Central Vicariate']);
        $this->parish = Parish::create(['name' => 'St. Sebastian Cathedral', 'vicariate_id' => $vicariate->id, 'is_active' => true]);

        $this->pastor = User::create([
            'username' => 'fr_pastor',
            'email' => 'pastor@rcal.ph',
            'role' => RoleEnum::CLERGY,
            'home_parish_id' => $this->parish->id,
            'password' => Hash::make('password'),
            'is_active' => true,
        ]);

        $this->clerk = User::create([
            'username' => 'parish_clerk',
            'email' => 'clerk@rcal.ph',
            'role' => RoleEnum::PARISH_STAFF,
            'home_parish_id' => $this->parish->id,
            'password' => Hash::make('password'),
            'is_active' => true,
        ]);

        $person = Person::create(['first_name' => 'Maria', 'last_name' => 'Santos', 'sex' => 'female']);

        $this->record = SacramentalRecord::create([
            'person_id' => $person->id,
            'sacrament_type' => SacramentTypeEnum::BAPTISM,
            'event_date' => '2015-08-20',
            'book_number' => 1,
            'page_number' => 5,
            'entry_number' => 12,
            'originating_parish_id' => $this->parish->id,
            'status' => 'registered',
        ]);

        $this->workflow = app(DocumentWorkflowService::class);
    }

    public function test_certificate_request_follows_deterministic_lifecycle(): void
    {
        $cert = CertificateRequest::create([
            'record_id' => $this->record->id,
            'requester_name' => 'Maria Santos',
            'purpose' => 'Passport Application',
            'status' => RequestStatusEnum::PENDING,
        ]);

        // Step 1 -> 2: Verified
        $this->workflow->transitionCertificate($cert, RequestStatusEnum::VERIFIED, $this->clerk);
        $this->assertEquals(RequestStatusEnum::VERIFIED, $cert->status);
        $this->assertEquals($this->clerk->id, $cert->verified_by_user_id);

        // Step 2 -> 3: Approved
        $this->workflow->transitionCertificate($cert, RequestStatusEnum::APPROVED, $this->pastor);
        $this->assertEquals(RequestStatusEnum::APPROVED, $cert->status);

        // Step 3 -> 4: Ready
        $this->workflow->transitionCertificate($cert, RequestStatusEnum::READY, $this->clerk);
        $this->assertEquals(RequestStatusEnum::READY, $cert->status);

        // Step 4 -> 5: Issued
        $this->workflow->transitionCertificate($cert, RequestStatusEnum::ISSUED, $this->pastor);
        $this->assertEquals(RequestStatusEnum::ISSUED, $cert->status);
        $this->assertNotNull($cert->certificate_number);
        $this->assertStringStartsWith('RCAL-', $cert->certificate_number);
        $this->assertNotNull($cert->verification_token);
    }

    public function test_skipping_lifecycle_steps_is_strictly_forbidden(): void
    {
        $cert = CertificateRequest::create([
            'record_id' => $this->record->id,
            'requester_name' => 'Maria Santos',
            'status' => RequestStatusEnum::PENDING,
        ]);

        // Attempt invalid jump from PENDING directly to ISSUED
        $this->expectException(ValidationException::class);
        $this->workflow->transitionCertificate($cert, RequestStatusEnum::ISSUED, $this->pastor);
    }

    public function test_rejecting_certificate_requires_mandatory_reason(): void
    {
        $cert = CertificateRequest::create([
            'record_id' => $this->record->id,
            'requester_name' => 'Maria Santos',
            'status' => RequestStatusEnum::PENDING,
        ]);

        $this->expectException(ValidationException::class);
        $this->workflow->transitionCertificate($cert, RequestStatusEnum::REJECTED, $this->clerk, '');
    }

    public function test_issuing_certificate_synchronizes_linked_document_request(): void
    {
        $parishioner = User::create([
            'username' => 'parishioner_test',
            'email' => 'client@rcal.ph',
            'role' => RoleEnum::PARISHIONER,
            'password' => Hash::make('password'),
            'is_active' => true,
        ]);

        $doc = $this->workflow->fileDocumentRequest([
            'targeted_parish_id' => $this->parish->id,
            'sacrament_type' => 'baptism',
            'name_on_record' => 'Maria Santos',
            'date_of_birth' => '2015-01-01',
            'purpose' => 'Personal Copy',
        ], $parishioner);

        $cert = CertificateRequest::create([
            'record_id' => $this->record->id,
            'requester_name' => 'Maria Santos',
            'status' => RequestStatusEnum::PENDING,
        ]);

        $doc->update(['certificate_request_id' => $cert->id, 'matched_record_id' => $this->record->id]);
        $cert->refresh();

        $this->workflow->transitionCertificate($cert, RequestStatusEnum::VERIFIED, $this->clerk);
        $this->workflow->transitionCertificate($cert, RequestStatusEnum::APPROVED, $this->pastor);
        $this->workflow->transitionCertificate($cert, RequestStatusEnum::READY, $this->clerk);
        $this->workflow->transitionCertificate($cert, RequestStatusEnum::ISSUED, $this->pastor);

        $this->assertEquals(\App\Enums\DocumentRequestStatusEnum::COMPLETED, $doc->fresh()->status);
        $this->assertNotNull($doc->fresh()->issued_at);
    }

    public function test_staff_can_transition_certificate_via_http_endpoint(): void
    {
        $cert = CertificateRequest::create([
            'record_id' => $this->record->id,
            'requester_name' => 'Maria Santos',
            'status' => RequestStatusEnum::PENDING,
            'purpose' => 'Verification test',
        ]);

        $response = $this->actingAs($this->clerk)->post("/certificates/{$cert->id}/transition", [
            'target_status' => 'verified',
            'reason' => 'Ledger folio verified against physical book',
        ]);

        $response->assertRedirect("/certificates/{$cert->id}");
        $response->assertSessionHas('success');

        $cert->refresh();
        $this->assertEquals(RequestStatusEnum::VERIFIED, $cert->status);
        $this->assertEquals($this->clerk->id, $cert->verified_by_user_id);
    }

    public function test_staff_assisted_request_filing_syncs_with_parishioner_portal(): void
    {
        $parishioner = User::create([
            'username' => 'assisted_parishioner',
            'email' => 'assisted@rcal.ph',
            'display_name' => 'Assisted Parishioner',
            'role' => RoleEnum::PARISHIONER,
            'password' => Hash::make('password'),
            'is_active' => true,
        ]);

        // Staff files certificate request for parishioner
        $response = $this->actingAs($this->clerk)->post('/certificates', [
            'record_id' => $this->record->id,
            'parishioner_id' => $parishioner->id,
            'requester_name' => 'Assisted Parishioner',
            'requester_contact' => '7562572',
            'purpose' => 'Embassy Visa Requirement',
        ]);

        $this->assertDatabaseHas('certificate_requests', [
            'record_id' => $this->record->id,
            'requester_user_id' => $parishioner->id,
            'requester_name' => 'Assisted Parishioner',
        ]);

        $this->assertDatabaseHas('document_requests', [
            'parishioner_id' => $parishioner->id,
            'matched_record_id' => $this->record->id,
            'targeted_parish_id' => $this->parish->id,
        ]);

        // Parishioner logs in and visits dashboard
        $portalResponse = $this->actingAs($parishioner)->get('/portal/dashboard');
        $portalResponse->assertStatus(200);

        $portalRequests = $portalResponse->inertiaProps('documentRequests');
        $this->assertCount(1, $portalRequests);
        $this->assertEquals('Maria Santos', $portalRequests[0]['name_on_record']);
        $this->assertEquals('Assisted Parishioner', $portalRequests[0]['certificate_request']['requester_name']);
    }
}
