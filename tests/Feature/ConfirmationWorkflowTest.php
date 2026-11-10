<?php

namespace Tests\Feature;

use App\Enums\ClergyTitleEnum;
use App\Enums\RoleEnum;
use App\Enums\SacramentTypeEnum;
use App\Enums\ScheduleStatusEnum;
use App\Models\Clergy;
use App\Models\Parish;
use App\Models\SacramentalRecord;
use App\Models\SacramentSchedule;
use App\Models\ScheduleAttachment;
use App\Models\User;
use App\Models\Vicariate;
use Carbon\Carbon;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ConfirmationWorkflowTest extends TestCase
{
    protected Parish $parish;

    protected User $parishStaff;

    protected User $parishioner;

    protected Clergy $clergy;

    protected function setUp(): void
    {
        parent::setUp();

        $vicariate = Vicariate::create(['name' => 'Vicariate Confirmation Test']);
        $this->parish = Parish::create([
            'name' => 'San Sebastian Cathedral Parish',
            'vicariate_id' => $vicariate->id,
            'is_active' => true,
        ]);

        $this->parishStaff = User::create([
            'username' => 'staff_confirmation',
            'email' => 'staff_kumpil@parish.rcal.ph',
            'role' => RoleEnum::PARISH_STAFF,
            'home_parish_id' => $this->parish->id,
            'password' => Hash::make('password'),
            'is_active' => true,
        ]);

        $this->parishioner = User::create([
            'username' => 'parishioner_confirmation',
            'email' => 'candidate_kumpil@rcal.ph',
            'role' => RoleEnum::PARISHIONER,
            'home_parish_id' => $this->parish->id,
            'password' => Hash::make('password'),
            'phone' => '09171234567',
            'is_active' => true,
        ]);

        $this->clergy = Clergy::create([
            'first_name' => 'Gilbert',
            'last_name' => 'Garcera',
            'title' => ClergyTitleEnum::ARCHBISHOP,
            'sex' => 'male',
            'is_active' => true,
        ]);
    }

    public function test_parishioner_can_submit_confirmation_request_with_online_documents(): void
    {
        Storage::fake('public');

        $baptismalCert = UploadedFile::fake()->create('candidate_baptismal_cert.pdf', 500, 'application/pdf');
        $sponsorCert = UploadedFile::fake()->create('sponsor_confirmation_cert.jpg', 400, 'image/jpeg');

        $response = $this->actingAs($this->parishioner)->post('/portal/schedule-requests', [
            'requester_name' => 'Juan Mercado',
            'requester_contact' => '09171234567',
            'requester_email' => 'juan.mercado@example.com',
            'requester_relationship' => 'Parent',
            'requester_address' => 'Barangay Sabang, Lipa City',
            'parish_id' => $this->parish->id,
            'sacrament_type' => 'confirmation',
            'starts_at' => null, // Office assigns date
            'certificate_submission_mode' => 'online',
            'specific_data' => [
                'candidate_name' => 'Lorenzo Mercado',
                'candidate_dob' => '2010-08-15',
                'candidate_gender' => 'Male',
                'candidate_father_name' => 'Juan Mercado',
                'candidate_mother_name' => 'Maria Santos',
                'baptism_parish' => 'San Sebastian Cathedral, Lipa City',
                'baptism_date' => '2010-11-20',
                'godparent_name' => 'Carlos Mendoza',
                'godparent_age' => '28',
                'godparent_certificate_type' => 'confirmation',
                'confirmation_resides_within_parish' => 'yes',
            ],
            'baptismal_cert_subject' => $baptismalCert,
            'confirmation_cert_godparents' => $sponsorCert,
        ]);

        $response->assertRedirect('/portal/dashboard');

        $this->assertDatabaseHas('sacrament_schedules', [
            'requester_user_id' => $this->parishioner->id,
            'parish_id' => $this->parish->id,
            'sacrament_type' => 'confirmation',
            'title' => 'Confirmation Request - Lorenzo Mercado',
            'starts_at' => null,
            'ends_at' => null,
            'requested_clergy_id' => null,
            'certificate_submission_mode' => 'online',
            'status' => ScheduleStatusEnum::REQUESTED->value,
        ]);

        $schedule = SacramentSchedule::where('requester_user_id', $this->parishioner->id)->firstOrFail();
        $this->assertCount(2, $schedule->attachments);
        $this->assertTrue($schedule->attachments->contains('document_type', 'baptismal_cert_subject'));
        $this->assertTrue($schedule->attachments->contains('document_type', 'confirmation_cert_godparents'));
    }

    public function test_parishioner_can_submit_confirmation_with_office_follow_up_mode(): void
    {
        $response = $this->actingAs($this->parishioner)->post('/portal/schedule-requests', [
            'requester_name' => 'Elena Bautista',
            'requester_contact' => '7561122',
            'requester_email' => 'elena.bautista@example.com',
            'requester_relationship' => 'Self',
            'requester_address' => 'Poblacion, Lipa City',
            'parish_id' => $this->parish->id,
            'sacrament_type' => 'confirmation',
            'starts_at' => null,
            'certificate_submission_mode' => 'follow_up_office',
            'specific_data' => [
                'candidate_name' => 'Elena Bautista',
                'candidate_dob' => '2008-04-10',
                'candidate_gender' => 'Female',
                'candidate_father_name' => 'Eduardo Bautista',
                'candidate_mother_name' => 'Corazon Reyes',
                'baptism_parish' => 'Our Lady of Mount Carmel, Lipa City',
                'godparent_name' => 'Teresa Ramos',
                'godparent_age' => '32',
                'godparent_certificate_type' => 'marriage',
                'confirmation_resides_within_parish' => 'yes',
            ],
        ]);

        $response->assertRedirect('/portal/dashboard');

        $this->assertDatabaseHas('sacrament_schedules', [
            'requester_user_id' => $this->parishioner->id,
            'sacrament_type' => 'confirmation',
            'certificate_submission_mode' => 'follow_up_office',
            'starts_at' => null,
        ]);

        $schedule = SacramentSchedule::where('requester_user_id', $this->parishioner->id)->latest()->first();
        $this->assertCount(0, $schedule->attachments);
    }

    public function test_parishioner_can_submit_streamlined_confirmation_appointment(): void
    {
        $response = $this->actingAs($this->parishioner)->post('/portal/schedule-requests', [
            'parish_id' => $this->parish->id,
            'sacrament_type' => 'confirmation',
            'requester_contact' => '09179876543',
            'requester_email' => null, // Optional Gmail left blank
            'starts_at' => null,
            'certificate_submission_mode' => 'follow_up_office',
            'specific_data' => [
                'child_name' => 'Gabriel Mercado',
                'dob' => '2012-05-10',
                'place_of_birth' => 'Mary Mediatrix Medical Center, Lipa City',
                'address' => 'Barangay Sabang, Lipa City, Batangas',
                'home_parish' => 'San Sebastian Cathedral Parish',
                'date_baptized' => '2012-08-15',
                'place_of_baptism' => '4217 / Poblacion / Lipa City',
                'father_name' => 'Juan Mercado',
                'mother_name' => 'Maria Santos',
                'godfather_name' => 'Vicente Gomez',
                'godfather_pob' => 'Batangas City',
                'godfather_address' => 'Barangay Kumintang Ibaba, Batangas City',
                'godmother_name' => 'Lucia Gomez',
                'godmother_pob' => 'San Jose, Batangas',
                'godmother_address' => 'Barangay Taysan, San Jose, Batangas',
            ],
        ]);

        $response->assertRedirect('/portal/dashboard');

        $this->assertDatabaseHas('sacrament_schedules', [
            'requester_user_id' => $this->parishioner->id,
            'parish_id' => $this->parish->id,
            'sacrament_type' => 'confirmation',
            'title' => 'Confirmation Request - Gabriel Mercado',
            'starts_at' => null,
            'requester_contact' => '09179876543',
            'certificate_submission_mode' => 'follow_up_office',
            'status' => ScheduleStatusEnum::REQUESTED->value,
        ]);

        $schedule = SacramentSchedule::where('requester_user_id', $this->parishioner->id)->latest()->firstOrFail();
        $this->assertCount(0, $schedule->attachments);
        $this->assertStringContainsString('Vicente Gomez (Ninong)', $schedule->specific_data['godparents']);
        $this->assertStringContainsString('Lucia Gomez (Ninang)', $schedule->specific_data['godparents']);
        $this->assertEquals('Gabriel Mercado', $schedule->specific_data['candidate_name']);
        $this->assertEquals('2012-05-10', $schedule->specific_data['candidate_dob']);
        $this->assertEquals('Barangay Sabang, Lipa City, Batangas', $schedule->specific_data['address']);
        $this->assertEquals('Barangay Sabang, Lipa City, Batangas', $schedule->specific_data['candidate_address']);
        $this->assertEquals('Barangay Sabang, Lipa City, Batangas', $schedule->requester_address);
    }

    public function test_schedule_attachment_preview_and_download_routes(): void
    {
        Storage::fake('public');

        $filePath = 'schedule_attachments/test_baptismal_cert.pdf';
        Storage::disk('public')->put($filePath, '%PDF-1.4 test dummy content');

        $schedule = SacramentSchedule::create([
            'requester_user_id' => $this->parishioner->id,
            'parish_id' => $this->parish->id,
            'sacrament_type' => 'confirmation',
            'title' => 'Confirmation Request - Lorenzo Mercado',
            'starts_at' => null,
            'ends_at' => null,
            'status' => ScheduleStatusEnum::REQUESTED,
            'requester_name' => 'Juan Mercado',
            'requester_contact' => '09171234567',
            'requester_email' => 'juan@example.com',
            'requester_relationship' => 'Parent',
            'requester_address' => 'Lipa City',
        ]);

        $attachment = ScheduleAttachment::create([
            'sacrament_schedule_id' => $schedule->id,
            'document_type' => 'baptismal_cert_subject',
            'file_path' => $filePath,
        ]);

        // Staff can preview inline
        $staffViewResp = $this->actingAs($this->parishStaff)->get("/schedule-attachments/{$attachment->id}/view");
        $staffViewResp->assertStatus(200);
        $staffViewResp->assertHeader('Content-Disposition', 'inline; filename="test_baptismal_cert.pdf"');

        // Staff can download
        $staffDlResp = $this->actingAs($this->parishStaff)->get("/schedule-attachments/{$attachment->id}/download");
        $staffDlResp->assertStatus(200);

        // Requester parishioner can preview
        $parishionerResp = $this->actingAs($this->parishioner)->get("/schedule-attachments/{$attachment->id}/view");
        $parishionerResp->assertStatus(200);

        // Another random user cannot access
        $otherUser = User::create([
            'username' => 'other_user',
            'email' => 'other@example.com',
            'role' => RoleEnum::PARISHIONER,
            'password' => Hash::make('password'),
            'is_active' => true,
        ]);
        $forbiddenResp = $this->actingAs($otherUser)->get("/schedule-attachments/{$attachment->id}/view");
        $forbiddenResp->assertStatus(403);
    }

    public function test_parish_staff_can_process_confirmation_and_assign_schedule_and_clergy(): void
    {
        $schedule = SacramentSchedule::create([
            'requester_user_id' => $this->parishioner->id,
            'parish_id' => $this->parish->id,
            'sacrament_type' => 'confirmation',
            'title' => 'Confirmation Request - Lorenzo Mercado',
            'starts_at' => null,
            'ends_at' => null,
            'status' => ScheduleStatusEnum::REQUESTED,
            'requester_name' => 'Juan Mercado',
            'requester_contact' => '09171234567',
            'requester_email' => 'juan@example.com',
            'requester_relationship' => 'Parent',
            'requester_address' => 'Lipa City',
            'specific_data' => [
                'candidate_name' => 'Lorenzo Mercado',
                'candidate_dob' => '2010-08-15',
                'candidate_gender' => 'Male',
                'candidate_father_name' => 'Juan Mercado',
                'candidate_mother_name' => 'Maria Santos',
                'godparent_name' => 'Carlos Mendoza',
            ],
        ]);

        $assignedDate = Carbon::now()->addDays(14)->setTime(9, 0);

        $response = $this->actingAs($this->parishStaff)->post("/schedules/{$schedule->id}/status", [
            'status' => 'scheduled',
            'starts_at' => $assignedDate->format('Y-m-d H:i:s'),
            'ends_at' => $assignedDate->copy()->addHours(2)->format('Y-m-d H:i:s'),
            'presiding_clergy_id' => $this->clergy->id,
            'staff_notes' => 'Please bring original copy of candidate baptismal certificate to the office on Friday for ledger stamping.',
            'document_checklist' => [
                'baptism_subject' => true,
                'confirmation_witnesses' => false,
                'psa_birth_cert' => false,
            ],
        ]);

        $response->assertRedirect();

        $schedule->refresh();
        $this->assertEquals(ScheduleStatusEnum::SCHEDULED, $schedule->status);
        $this->assertEquals($this->clergy->id, $schedule->presiding_clergy_id);
        $this->assertNotNull($schedule->starts_at);
        $this->assertEquals($assignedDate->format('Y-m-d H:i:s'), $schedule->starts_at->format('Y-m-d H:i:s'));
        $this->assertTrue($schedule->document_checklist['baptism_subject']);
        $this->assertStringContainsString('ledger stamping', $schedule->staff_notes);
    }

    public function test_parish_staff_can_complete_confirmation_and_transcribe_record(): void
    {
        $ceremonyDate = Carbon::now()->setTime(10, 0);

        $schedule = SacramentSchedule::create([
            'requester_user_id' => $this->parishioner->id,
            'parish_id' => $this->parish->id,
            'sacrament_type' => 'confirmation',
            'title' => 'Confirmation Request - Lorenzo Mercado',
            'starts_at' => $ceremonyDate,
            'ends_at' => $ceremonyDate->copy()->addHour(),
            'status' => ScheduleStatusEnum::SCHEDULED,
            'presiding_clergy_id' => $this->clergy->id,
            'requester_name' => 'Juan Mercado',
            'requester_contact' => '09171234567',
            'requester_email' => 'juan@example.com',
            'requester_relationship' => 'Parent',
            'requester_address' => 'Lipa City',
            'specific_data' => [
                'candidate_name' => 'Lorenzo Mercado',
                'candidate_dob' => '2010-08-15',
                'candidate_gender' => 'Male',
                'candidate_father_name' => 'Juan Mercado',
                'candidate_mother_name' => 'Maria Santos',
                'godparent_name' => 'Carlos Mendoza',
            ],
        ]);

        $response = $this->actingAs($this->parishStaff)->post("/schedules/{$schedule->id}/status", [
            'status' => 'completed',
            'book_number' => 5,
            'page_number' => 88,
            'entry_number' => 12,
        ]);

        $response->assertRedirect();

        $schedule->refresh();
        $this->assertEquals(ScheduleStatusEnum::COMPLETED, $schedule->status);
        $this->assertNotNull($schedule->record_id);

        $record = SacramentalRecord::findOrFail($schedule->record_id);
        $this->assertEquals(SacramentTypeEnum::CONFIRMATION, $record->sacrament_type);
        $this->assertEquals(5, $record->book_number);
        $this->assertEquals(88, $record->page_number);
        $this->assertEquals(12, $record->entry_number);
        $this->assertEquals('Carlos Mendoza', $record->godparents);
        $this->assertEquals($this->clergy->id, $record->performed_by_clergy_id);
        $this->assertEquals($this->parish->id, $record->originating_parish_id);

        // Person record verification
        $person = $record->person;
        $this->assertEquals('Lorenzo', $person->first_name);
        $this->assertEquals('Mercado', $person->last_name);
        $this->assertEquals('2010-08-15', $person->date_of_birth->format('Y-m-d'));
        $this->assertEquals('Male', $person->sex);
        $this->assertEquals('Juan Mercado', $person->father_name);
        $this->assertEquals('Maria Santos', $person->mother_name);
    }
}
