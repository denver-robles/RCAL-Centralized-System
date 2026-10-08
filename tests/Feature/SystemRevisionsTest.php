<?php

namespace Tests\Feature;

use App\Console\Commands\PruneAuditLogs;
use App\Enums\AuditActionEnum;
use App\Enums\ClergyTitleEnum;
use App\Enums\DocumentRequestStatusEnum;
use App\Enums\RequestStatusEnum;
use App\Enums\RoleEnum;
use App\Enums\SacramentTypeEnum;
use App\Models\AuditLog;
use App\Models\CertificateRequest;
use App\Models\Clergy;
use App\Models\DocumentRequest;
use App\Models\Parish;
use App\Models\Person;
use App\Models\SacramentalRecord;
use App\Models\User;
use App\Models\Vicariate;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class SystemRevisionsTest extends TestCase
{
    protected Parish $parish;
    protected User $chanceryAdmin;
    protected User $parishStaff;
    protected User $parishioner;
    protected SacramentalRecord $record;

    protected function setUp(): void
    {
        parent::setUp();

        $vicariate = Vicariate::create(['name' => 'Vicariate I']);
        $this->parish = Parish::create([
            'name' => 'Cathedral Parish of Saint Sebastian',
            'vicariate_id' => $vicariate->id,
            'is_active' => true,
        ]);

        $this->chanceryAdmin = User::create([
            'username' => 'chancery_admin',
            'email' => 'admin@chancery.rcal.ph',
            'role' => RoleEnum::CHANCERY,
            'home_parish_id' => $this->parish->id,
            'password' => Hash::make('password'),
            'is_active' => true,
        ]);

        $this->parishStaff = User::create([
            'username' => 'staff_member',
            'email' => 'staff@parish.rcal.ph',
            'role' => RoleEnum::PARISH_STAFF,
            'home_parish_id' => $this->parish->id,
            'password' => Hash::make('password'),
            'is_active' => true,
        ]);

        $this->parishioner = User::create([
            'username' => 'test_parishioner',
            'email' => 'parishioner@rcal.ph',
            'role' => RoleEnum::PARISHIONER,
            'home_parish_id' => $this->parish->id,
            'password' => Hash::make('password'),
            'phone' => '7562572',
            'is_active' => true,
        ]);

        $person = Person::create([
            'first_name' => 'Juan',
            'last_name' => 'Dela Cruz',
            'sex' => 'male',
        ]);

        $this->record = SacramentalRecord::create([
            'originating_parish_id' => $this->parish->id,
            'person_id' => $person->id,
            'sacrament_type' => SacramentTypeEnum::BAPTISM,
            'event_date' => '2018-05-12',
            'book_number' => 2,
            'page_number' => 14,
            'entry_number' => 88,
            'registry_number' => 'BAP-2018-0088',
            'status' => 'registered',
        ]);
    }

    public function test_contact_number_must_be_exactly_seven_digits_in_certificate_request(): void
    {
        // 11 digits should fail
        $response1 = $this->actingAs($this->parishStaff)->post('/certificates', [
            'record_id' => $this->record->id,
            'requester_name' => 'Juan Dela Cruz',
            'requester_contact' => '09171234567',
            'purpose' => 'Passport Application',
        ]);
        $response1->assertSessionHasErrors(['requester_contact']);

        // 6 digits should fail
        $response2 = $this->actingAs($this->parishStaff)->post('/certificates', [
            'record_id' => $this->record->id,
            'requester_name' => 'Juan Dela Cruz',
            'requester_contact' => '123456',
            'purpose' => 'Passport Application',
        ]);
        $response2->assertSessionHasErrors(['requester_contact']);

        // Letters should fail
        $response3 = $this->actingAs($this->parishStaff)->post('/certificates', [
            'record_id' => $this->record->id,
            'requester_name' => 'Juan Dela Cruz',
            'requester_contact' => '756257A',
            'purpose' => 'Passport Application',
        ]);
        $response3->assertSessionHasErrors(['requester_contact']);

        // Exactly 7 numeric digits should pass
        $responseValid = $this->actingAs($this->parishStaff)->post('/certificates', [
            'record_id' => $this->record->id,
            'requester_name' => 'Juan Dela Cruz',
            'requester_contact' => '7562572',
            'purpose' => 'Passport Application',
        ]);
        $responseValid->assertSessionHasNoErrors();
        $this->assertDatabaseHas('certificate_requests', [
            'record_id' => $this->record->id,
            'requester_contact' => '7562572',
        ]);
    }

    public function test_contact_number_must_be_exactly_seven_digits_in_sacrament_schedule(): void
    {
        // 11-digit contact should fail
        $failResponse = $this->actingAs($this->parishStaff)->post('/schedules', [
            'parish_id' => $this->parish->id,
            'sacrament_type' => 'baptism',
            'title' => 'Baptism of Pedro',
            'starts_at' => now()->addDays(3)->format('Y-m-d H:i:s'),
            'ends_at' => now()->addDays(3)->addHour()->format('Y-m-d H:i:s'),
            'requester_name' => 'Pedro Penduko',
            'requester_contact' => '09181234567',
        ]);
        $failResponse->assertSessionHasErrors(['requester_contact']);

        // 7 digits should pass
        $passResponse = $this->actingAs($this->parishStaff)->post('/schedules', [
            'parish_id' => $this->parish->id,
            'sacrament_type' => 'baptism',
            'title' => 'Baptism of Pedro',
            'starts_at' => now()->addDays(3)->format('Y-m-d H:i:s'),
            'ends_at' => now()->addDays(3)->addHour()->format('Y-m-d H:i:s'),
            'requester_name' => 'Pedro Penduko',
            'requester_contact' => '7562572',
        ]);
        $passResponse->assertSessionHasNoErrors();
        $this->assertDatabaseHas('sacrament_schedules', [
            'requester_name' => 'Pedro Penduko',
            'requester_contact' => '7562572',
        ]);
    }

    public function test_sacrament_schedule_rejects_past_dates(): void
    {
        $pastDateResponse = $this->actingAs($this->parishStaff)->post('/schedules', [
            'parish_id' => $this->parish->id,
            'sacrament_type' => 'wedding',
            'title' => 'Wedding of Romeo and Juliet',
            'starts_at' => now()->subDay()->format('Y-m-d H:i:s'),
            'ends_at' => now()->subDay()->addHour()->format('Y-m-d H:i:s'),
            'requester_name' => 'Romeo Santos',
            'requester_contact' => '7562572',
        ]);

        $pastDateResponse->assertSessionHasErrors(['starts_at']);
    }

    public function test_name_suffix_strictly_validates_canonical_options(): void
    {
        // Invalid suffix should fail
        $invalidResponse = $this->actingAs($this->parishStaff)->post('/records', [
            'originating_parish_id' => $this->parish->id,
            'sacrament_type' => 'baptism',
            'first_name' => 'Mark',
            'last_name' => 'Anthony',
            'suffix' => 'King',
            'sex' => 'male',
            'event_date' => '2023-01-15',
            'book_number' => 3,
            'page_number' => 10,
            'entry_number' => 25,
        ]);
        $invalidResponse->assertSessionHasErrors(['suffix']);

        // Valid canonical suffix (Jr.) should pass
        $validResponse = $this->actingAs($this->parishStaff)->post('/records', [
            'originating_parish_id' => $this->parish->id,
            'sacrament_type' => 'baptism',
            'first_name' => 'Mark',
            'last_name' => 'Anthony',
            'suffix' => 'Jr.',
            'sex' => 'male',
            'event_date' => '2023-01-15',
            'book_number' => 3,
            'page_number' => 10,
            'entry_number' => 25,
        ]);
        $validResponse->assertSessionHasNoErrors();
    }

    public function test_matching_unmatched_parishioner_claim_creates_certificate_and_syncs_workflow(): void
    {
        // Parishioner submits document claim
        $claim = DocumentRequest::create([
            'tracking_code' => 'RCAL-REQ-CLAIM99',
            'parishioner_id' => $this->parishioner->id,
            'targeted_parish_id' => $this->parish->id,
            'sacrament_type' => SacramentTypeEnum::BAPTISM->value,
            'name_on_record' => 'Juan Dela Cruz',
            'status' => DocumentRequestStatusEnum::SUBMITTED->value,
        ]);

        $this->assertNull($claim->certificate_request_id);

        // Staff matches claim against canonical record
        $matchResponse = $this->actingAs($this->parishStaff)->post('/certificates/match-claim', [
            'document_request_id' => $claim->id,
            'record_id' => $this->record->id,
            'purpose' => 'First Holy Communion Verification',
        ]);

        $matchResponse->assertRedirect();
        $matchResponse->assertSessionHas('success');

        $claim->refresh();
        $this->assertNotNull($claim->certificate_request_id);
        $this->assertEquals(DocumentRequestStatusEnum::UNDER_REVIEW, $claim->status);

        // Newly matched certificate starts at pending
        $cert = CertificateRequest::find($claim->certificate_request_id);
        $this->assertNotNull($cert);
        $this->assertEquals(RequestStatusEnum::PENDING, $cert->status);

        // Staff transitions to verified
        $this->actingAs($this->parishStaff)->post("/certificates/{$cert->id}/transition", [
            'target_status' => 'verified',
            'reason' => 'Ledger folio verified against canonical book',
        ]);

        $claim->refresh();
        $this->assertEquals(DocumentRequestStatusEnum::UNDER_REVIEW, $claim->status);

        // Transition to approved
        $this->actingAs($this->chanceryAdmin)->post("/certificates/{$cert->id}/transition", [
            'target_status' => 'approved',
            'reason' => 'Curia seal approved',
        ]);

        $claim->refresh();
        $this->assertEquals(DocumentRequestStatusEnum::PROCESSING, $claim->status);

        // Transition to ready
        $this->actingAs($this->parishStaff)->post("/certificates/{$cert->id}/transition", [
            'target_status' => 'ready',
            'reason' => 'Printed with embossed dry seal',
        ]);

        $claim->refresh();
        $this->assertEquals(DocumentRequestStatusEnum::READY, $claim->status);

        // Transition to issued
        $this->actingAs($this->parishStaff)->post("/certificates/{$cert->id}/transition", [
            'target_status' => 'issued',
            'reason' => 'Released across chancery counter',
        ]);

        $claim->refresh();
        $this->assertEquals(DocumentRequestStatusEnum::COMPLETED, $claim->status);
    }

    public function test_clergy_directory_inscribe_creates_clergy_and_assignment(): void
    {
        $response = $this->actingAs($this->parishStaff)->post('/clergy', [
            'title' => 'father',
            'first_name' => 'Emmanuel',
            'middle_name' => 'Katigbak',
            'last_name' => 'Reyes',
            'suffix' => 'II',
            'ordination_date' => '2012-06-29',
            'date_of_birth' => '1985-04-10',
            'status' => 'Active Ministry',
            'parish_id' => $this->parish->id,
            'assignment_role' => 'assistant_priest',
        ]);

        $response->assertRedirect('/clergy');
        $response->assertSessionHas('success');

        $this->assertDatabaseHas('clergy', [
            'title' => ClergyTitleEnum::FATHER->value,
            'first_name' => 'Emmanuel',
            'last_name' => 'Reyes',
            'suffix' => 'II',
        ]);

        $clergy = Clergy::where('first_name', 'Emmanuel')->where('last_name', 'Reyes')->first();
        $this->assertNotNull($clergy);

        $this->assertDatabaseHas('clergy_assignments', [
            'clergy_id' => $clergy->id,
            'parish_id' => $this->parish->id,
            'role' => 'assistant_priest',
        ]);
    }

    public function test_account_directory_allows_soft_deleting_users_and_guards_against_self_deletion(): void
    {
        $targetUser = User::create([
            'username' => 'staff_to_deactivate',
            'email' => 'todeactivate@rcal.ph',
            'role' => RoleEnum::PARISH_STAFF,
            'home_parish_id' => $this->parish->id,
            'password' => Hash::make('password'),
            'is_active' => true,
        ]);

        // Chancery admin deletes user -> succeeds and soft-deletes
        $deleteResponse = $this->actingAs($this->chanceryAdmin)->delete("/users/{$targetUser->id}");
        $deleteResponse->assertRedirect('/users');
        $deleteResponse->assertSessionHas('success');

        $this->assertSoftDeleted('users', [
            'id' => $targetUser->id,
        ]);

        // Chancery admin attempts to delete self -> rejected
        $selfDeleteResponse = $this->actingAs($this->chanceryAdmin)->delete("/users/{$this->chanceryAdmin->id}");
        $selfDeleteResponse->assertSessionHas('error');
        $this->assertNotSoftDeleted('users', [
            'id' => $this->chanceryAdmin->id,
        ]);
    }

    public function test_audit_retention_prune_deletes_records_older_than_30_days(): void
    {
        // Insert audit log older than 30 days
        $oldLog = AuditLog::create([
            'user_id' => $this->chanceryAdmin->id,
            'actor_username' => $this->chanceryAdmin->username,
            'action' => AuditActionEnum::LOGIN,
            'note' => 'Old historical login from last month',
            'created_at' => now()->subDays(35),
        ]);

        // Insert fresh audit log
        $freshLog = AuditLog::create([
            'user_id' => $this->chanceryAdmin->id,
            'actor_username' => $this->chanceryAdmin->username,
            'action' => AuditActionEnum::LOGIN,
            'note' => 'Recent login from 2 days ago',
            'created_at' => now()->subDays(2),
        ]);

        // Run artisan prune retention
        $exitCode = Artisan::call('audit:prune-retention');
        $this->assertEquals(0, $exitCode);

        // Assert old log is purged
        $this->assertDatabaseMissing('audit_logs', [
            'id' => $oldLog->id,
        ]);

        // Assert recent log is retained
        $this->assertDatabaseHas('audit_logs', [
            'id' => $freshLog->id,
        ]);
    }

    public function test_chancery_admin_can_trigger_audit_prune_via_endpoint(): void
    {
        // Old record to be pruned
        $oldLog = AuditLog::create([
            'user_id' => $this->chanceryAdmin->id,
            'actor_username' => $this->chanceryAdmin->username,
            'action' => AuditActionEnum::STATUS_CHANGE,
            'note' => 'Historical status change > 30 days',
            'created_at' => now()->subDays(40),
        ]);

        // Regular staff cannot prune (403)
        $staffResponse = $this->actingAs($this->parishStaff)->post('/audit/prune');
        $staffResponse->assertStatus(403);

        // Chancery admin triggers prune
        $adminResponse = $this->actingAs($this->chanceryAdmin)->post('/audit/prune');
        $adminResponse->assertRedirect('/audit');
        $adminResponse->assertSessionHas('success');

        // Assert old record was pruned
        $this->assertDatabaseMissing('audit_logs', [
            'id' => $oldLog->id,
        ]);
    }
}
