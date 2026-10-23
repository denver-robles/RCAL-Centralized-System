<?php

namespace Tests\Feature;

use App\Enums\RoleEnum;
use App\Enums\SacramentTypeEnum;
use App\Enums\ScheduleTypeEnum;
use App\Enums\DocumentRequestStatusEnum;
use App\Models\CertificateRequest;
use App\Models\DocumentRequest;
use App\Models\Parish;
use App\Models\Person;
use App\Models\SacramentalRecord;
use App\Models\SacramentSchedule;
use App\Models\User;
use App\Models\Vicariate;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class SecurityHardeningTest extends TestCase
{
    use RefreshDatabase;

    protected Parish $parish;
    protected User $admin;
    protected User $parishStaff;
    protected User $parishioner;

    protected function setUp(): void
    {
        parent::setUp();

        $vicariate = Vicariate::create(['name' => 'Vicariate I']);
        $this->parish = Parish::create([
            'name' => 'St. Sebastian Cathedral',
            'vicariate_id' => $vicariate->id,
            'is_active' => true,
        ]);

        $this->admin = User::create([
            'username' => 'curia_admin',
            'email' => 'admin@rcal.ph',
            'role' => RoleEnum::ADMIN,
            'password' => Hash::make('secret123'),
            'must_change_password' => false,
            'is_active' => true,
        ]);

        $this->parishStaff = User::create([
            'username' => 'cathedral_sec',
            'email' => 'sec@cathedral.ph',
            'role' => RoleEnum::PARISH_STAFF,
            'home_parish_id' => $this->parish->id,
            'password' => Hash::make('secret123'),
            'must_change_password' => false,
            'is_active' => true,
        ]);

        $this->parishioner = User::create([
            'username' => 'mariadelacruz',
            'email' => 'maria@example.ph',
            'role' => RoleEnum::PARISHIONER,
            'password' => Hash::make('secret123'),
            'must_change_password' => false,
            'is_active' => true,
        ]);
    }

    public function test_user_with_must_change_password_is_forced_to_update_password(): void
    {
        $flaggedUser = User::create([
            'username' => 'needs_change',
            'email' => 'needschange@rcal.ph',
            'role' => RoleEnum::ADMIN,
            'password' => Hash::make('adminpw'),
            'must_change_password' => true,
            'is_active' => true,
        ]);

        // Attempting to visit dashboard redirects to change-password
        $response = $this->actingAs($flaggedUser)->get('/dashboard');
        $response->assertRedirect('/change-password');
        $response->assertSessionHas('warning');

        // Can render change password view
        $changeViewResponse = $this->actingAs($flaggedUser)->get('/change-password');
        $changeViewResponse->assertStatus(200);

        // Submitting new password clears flag and allows navigation
        $updateResponse = $this->actingAs($flaggedUser)->post('/change-password', [
            'password' => 'NewRobustPassword2026!',
            'password_confirmation' => 'NewRobustPassword2026!',
        ]);

        $updateResponse->assertRedirect('/dashboard');
        $flaggedUser->refresh();
        $this->assertFalse($flaggedUser->must_change_password);
        $this->assertTrue(Hash::check('NewRobustPassword2026!', $flaggedUser->password));

        // Now dashboard access succeeds
        $this->actingAs($flaggedUser)->get('/dashboard')->assertStatus(200);
    }

    public function test_confidential_id_document_is_served_only_to_authorized_parties(): void
    {
        Storage::fake('local');

        $uploadedDoc = UploadedFile::fake()->create('govt_id.jpg', 500, 'image/jpeg');
        $storedPath = $uploadedDoc->store('id_documents', 'local');

        $docRequest = DocumentRequest::create([
            'tracking_code' => 'RCAL-REQ-TEST1234567890',
            'parishioner_id' => $this->parishioner->id,
            'targeted_parish_id' => $this->parish->id,
            'sacrament_type' => SacramentTypeEnum::BAPTISM,
            'name_on_record' => 'Maria Dela Cruz',
            'date_of_birth' => '1995-05-15',
            'relationship_to_owner' => 'Self',
            'purpose' => 'Passport Application',
            'status' => DocumentRequestStatusEnum::SUBMITTED,
            'id_document_path' => $storedPath,
            'consent_given_at' => now(),
            'consent_version' => '1.0',
        ]);

        // 1. Guest is redirected to login
        $this->get("/documents/{$docRequest->id}/id-document")->assertRedirect('/login');

        // 2. Another unrelated parishioner is denied (403)
        $intruder = User::create([
            'username' => 'intruder',
            'email' => 'intruder@example.ph',
            'role' => RoleEnum::PARISHIONER,
            'password' => Hash::make('password'),
            'is_active' => true,
        ]);
        $this->actingAs($intruder)->get("/documents/{$docRequest->id}/id-document")->assertStatus(403);

        // 3. Document owner parishioner is allowed (200)
        $this->actingAs($this->parishioner)->get("/documents/{$docRequest->id}/id-document")->assertStatus(200);

        // 4. Assigned parish staff is allowed (200)
        $this->actingAs($this->parishStaff)->get("/documents/{$docRequest->id}/id-document")->assertStatus(200);

        // 5. Chancery Curia Admin is allowed (200)
        $this->actingAs($this->admin)->get("/documents/{$docRequest->id}/id-document")->assertStatus(200);
    }

    public function test_online_payment_upload_sets_pending_verification_and_requires_staff_confirmation(): void
    {
        Storage::fake('local');

        $schedule = SacramentSchedule::create([
            'requester_user_id' => $this->parishioner->id,
            'parish_id' => $this->parish->id,
            'sacrament_type' => ScheduleTypeEnum::BAPTISM,
            'title' => 'Baptism Schedule',
            'starts_at' => now()->addDays(5),
            'ends_at' => now()->addDays(5)->addHour(),
            'status' => \App\Enums\ScheduleStatusEnum::CONFIRMED,
            'requester_name' => 'Maria Dela Cruz',
            'requester_contact' => '7561234',
            'requester_email' => 'maria@example.ph',
            'requester_relationship' => 'Parent',
            'requester_address' => 'Lipa City',
            'payment_status' => 'unpaid',
        ]);

        $receiptFile = UploadedFile::fake()->create('gcash_receipt.png', 400, 'image/png');

        // Parishioner uploads online payment receipt
        $response = $this->actingAs($this->parishioner)->post("/portal/schedule-requests/{$schedule->id}/payment", [
            'payment_method' => 'online',
            'receipt' => $receiptFile,
        ]);

        $response->assertSessionHas('payment_recorded', true);
        $schedule->refresh();

        // Must be pending_verification, NEVER auto-marked as paid
        $this->assertEquals('pending_verification', $schedule->payment_status);
        $this->assertNotNull($schedule->payment_receipt_path);

        // Parish staff verifies and approves payment
        $verifyResponse = $this->actingAs($this->parishStaff)->post("/schedules/{$schedule->id}/verify-payment", [
            'payment_status' => 'paid',
        ]);

        $verifyResponse->assertSessionHas('success');
        $schedule->refresh();
        $this->assertEquals('paid', $schedule->payment_status);
    }

    public function test_public_track_endpoint_masks_name_for_privacy(): void
    {
        $doc = DocumentRequest::create([
            'tracking_code' => 'RCAL-REQ-SECURE12345678',
            'parishioner_id' => $this->parishioner->id,
            'targeted_parish_id' => $this->parish->id,
            'sacrament_type' => SacramentTypeEnum::BAPTISM,
            'name_on_record' => 'Juan Dela Cruz',
            'date_of_birth' => '1990-01-01',
            'relationship_to_owner' => 'Self',
            'purpose' => 'Civil Verification',
            'status' => \App\Enums\DocumentRequestStatusEnum::PROCESSING,
            'consent_given_at' => now(),
            'consent_version' => '1.0',
        ]);

        $response = $this->getJson('/track?code=RCAL-REQ-SECURE12345678');
        $response->assertStatus(200);

        // Name must be masked
        $response->assertJson([
            'tracking_code' => 'RCAL-REQ-SECURE12345678',
            'status' => 'processing',
            'name_on_record' => 'J*** D*** C***',
        ]);
    }

    public function test_certificate_verification_endpoint_masks_recipient_and_serves_html_and_json(): void
    {
        $person = Person::create([
            'first_name' => 'Alexander',
            'last_name' => 'Mendoza',
            'sex' => 'Male',
            'date_of_birth' => '2000-01-01',
        ]);

        $record = SacramentalRecord::create([
            'person_id' => $person->id,
            'sacrament_type' => SacramentTypeEnum::BAPTISM,
            'event_date' => '2000-02-15',
            'originating_parish_id' => $this->parish->id,
            'book_number' => 12,
            'page_number' => 45,
            'entry_number' => 7,
            'status' => 'registered',
        ]);

        $cert = CertificateRequest::create([
            'record_id' => $record->id,
            'requester_name' => 'Alexander Mendoza',
            'purpose' => 'Employment',
            'status' => 'issued',
            'certificate_number' => 'CERT-2026-0001',
            'verification_token' => 'VALID-CRYPTO-HASH-TOKEN-999',
            'issued_at' => now(),
        ]);

        // JSON API request returns masked name
        $jsonResponse = $this->getJson('/verify/VALID-CRYPTO-HASH-TOKEN-999');
        $jsonResponse->assertStatus(200);
        $jsonResponse->assertJson([
            'valid' => true,
            'certificate_number' => 'CERT-2026-0001',
            'recipient_name' => 'A**** M****',
        ]);

        // Browser HTML request renders Public/Verify Inertia page
        $htmlResponse = $this->get('/verify/VALID-CRYPTO-HASH-TOKEN-999');
        $htmlResponse->assertStatus(200);

        // Invalid token returns 404 in JSON
        $invalidJson = $this->getJson('/verify/NON-EXISTENT-TOKEN');
        $invalidJson->assertStatus(404);
        $invalidJson->assertJson(['valid' => false]);
    }
}
