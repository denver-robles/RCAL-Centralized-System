<?php

namespace Tests\Feature;

use App\Enums\ClergyTitleEnum;
use App\Enums\RoleEnum;
use App\Enums\ScheduleStatusEnum;
use App\Models\Clergy;
use App\Models\Parish;
use App\Models\SacramentSchedule;
use App\Models\SacramentSetting;
use App\Models\ScheduleAttachment;
use App\Models\User;
use App\Models\Vicariate;
use Carbon\Carbon;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class BaptismalWorkflowTest extends TestCase
{
    protected Parish $parish;

    protected User $parishStaff;

    protected User $parishioner;

    protected Clergy $clergy;

    protected function setUp(): void
    {
        parent::setUp();

        $vicariate = Vicariate::create(['name' => 'Vicariate Test']);
        $this->parish = Parish::create([
            'name' => 'St. Francis de Sales Parish',
            'vicariate_id' => $vicariate->id,
            'is_active' => true,
        ]);

        $this->parishStaff = User::create([
            'username' => 'staff_baptismal',
            'email' => 'staff_bap@parish.rcal.ph',
            'role' => RoleEnum::PARISH_STAFF,
            'home_parish_id' => $this->parish->id,
            'password' => Hash::make('password'),
            'is_active' => true,
        ]);

        $this->parishioner = User::create([
            'username' => 'parishioner_baptismal',
            'email' => 'parishioner_bap@rcal.ph',
            'role' => RoleEnum::PARISHIONER,
            'home_parish_id' => $this->parish->id,
            'password' => Hash::make('password'),
            'phone' => '7562572',
            'is_active' => true,
        ]);

        $this->clergy = Clergy::create([
            'first_name' => 'Antonio',
            'last_name' => 'Reyes',
            'title' => ClergyTitleEnum::FATHER,
            'sex' => 'male',
            'is_active' => true,
        ]);
    }

    public function test_parishioner_can_submit_baptismal_schedule_request_with_new_fields(): void
    {
        Storage::fake('public');

        // Configure allowed days for baptism (e.g. Saturday and Sunday)
        // Find next Saturday
        $nextSaturday = Carbon::now()->next(Carbon::SATURDAY)->setTime(10, 0);

        SacramentSetting::create([
            'parish_id' => $this->parish->id,
            'sacrament_type' => 'baptism',
            'is_available' => true,
            'allowed_days' => ['saturday', 'sunday'],
            'time_slots' => ['10:00-11:00'],
        ]);

        $confirmationCert = UploadedFile::fake()->create('confirmation_cert.pdf', 500, 'application/pdf');

        $response = $this->actingAs($this->parishioner)->post('/portal/schedule-requests', [
            'requester_name' => 'Maria Dela Cruz',
            'requester_contact' => '7562572',
            'requester_email' => 'maria@example.com',
            'requester_relationship' => 'Parent',
            'requester_address' => 'Barangay 1, Lipa City',
            'parish_id' => $this->parish->id,
            'sacrament_type' => 'baptism',
            'starts_at' => $nextSaturday->format('Y-m-d H:i:s'),
            'requested_clergy_id' => $this->clergy->id,
            'certificate_submission_mode' => 'online',
            'specific_data' => [
                'child_name' => 'Mateo Dela Cruz',
                'dob' => '2026-01-15',
                'place_of_birth' => 'Lipa City Hospital',
                'gender' => 'Male',
                'father_name' => 'Juan Dela Cruz',
                'mother_name' => 'Maria Santos',
                'parents_married' => 'married',
                'parents_status' => 'Married (Catholic Church)',
                'godparents' => 'Pedro Aquino, Elena Garcia',
                'resides_within_parish' => 'yes',
            ],
            'confirmation_cert_godparents' => $confirmationCert,
        ]);

        $response->assertRedirect(route('portal.dashboard'));

        $this->assertDatabaseHas('sacrament_schedules', [
            'parish_id' => $this->parish->id,
            'requester_user_id' => $this->parishioner->id,
            'sacrament_type' => 'baptism',
            'requested_clergy_id' => $this->clergy->id,
            'certificate_submission_mode' => 'online',
            'status' => ScheduleStatusEnum::REQUESTED->value,
        ]);

        $schedule = SacramentSchedule::where('requester_user_id', $this->parishioner->id)->first();
        $this->assertNotNull($schedule);
        $this->assertEquals('Mateo Dela Cruz', $schedule->specific_data['child_name']);

        $this->assertDatabaseHas('schedule_attachments', [
            'sacrament_schedule_id' => $schedule->id,
            'document_type' => 'confirmation_cert_godparents',
        ]);
    }

    public function test_schedule_request_fails_when_date_is_not_on_allowed_day(): void
    {
        // Restrict to Saturday and Sunday
        SacramentSetting::create([
            'parish_id' => $this->parish->id,
            'sacrament_type' => 'baptism',
            'is_available' => true,
            'allowed_days' => ['saturday', 'sunday'],
            'time_slots' => ['10:00-11:00'],
        ]);

        // Pick next Wednesday
        $nextWednesday = Carbon::now()->next(Carbon::WEDNESDAY)->setTime(10, 0);

        $response = $this->actingAs($this->parishioner)->post('/portal/schedule-requests', [
            'requester_name' => 'Maria Dela Cruz',
            'requester_contact' => '7562572',
            'requester_email' => 'maria@example.com',
            'requester_relationship' => 'Parent',
            'requester_address' => 'Barangay 1, Lipa City',
            'parish_id' => $this->parish->id,
            'sacrament_type' => 'baptism',
            'starts_at' => $nextWednesday->format('Y-m-d H:i:s'),
            'certificate_submission_mode' => 'follow_up_office',
            'specific_data' => [
                'child_name' => 'Mateo Dela Cruz',
            ],
        ]);

        $response->assertSessionHasErrors(['starts_at']);
    }

    public function test_staff_can_update_status_to_processing_with_checklist_and_reminders(): void
    {
        $schedule = SacramentSchedule::create([
            'parish_id' => $this->parish->id,
            'requester_user_id' => $this->parishioner->id,
            'sacrament_type' => 'baptism',
            'title' => 'Baptism Request - Mateo',
            'starts_at' => Carbon::tomorrow()->setTime(10, 0),
            'ends_at' => Carbon::tomorrow()->setTime(11, 0),
            'status' => ScheduleStatusEnum::REQUESTED,
            'requester_name' => 'Maria Dela Cruz',
            'certificate_submission_mode' => 'follow_up_office',
        ]);

        $response = $this->actingAs($this->parishStaff)->post("/schedules/{$schedule->id}/status", [
            'status' => 'processing',
            'staff_notes' => 'Please bring the original marriage certificate to the office desk by Thursday.',
            'document_checklist' => [
                'confirmation_witnesses' => true,
                'marriage_parents' => false,
                'psa_birth_cert' => true,
            ],
            'presiding_clergy_id' => $this->clergy->id,
        ]);

        $response->assertSessionHasNoErrors();
        $response->assertRedirect();

        $schedule->refresh();
        $this->assertEquals(ScheduleStatusEnum::PROCESSING, $schedule->status);
        $this->assertEquals('Please bring the original marriage certificate to the office desk by Thursday.', $schedule->staff_notes);
        $this->assertTrue($schedule->document_checklist['confirmation_witnesses']);
        $this->assertFalse($schedule->document_checklist['marriage_parents']);
        $this->assertEquals($this->clergy->id, $schedule->presiding_clergy_id);
    }

    public function test_marking_completed_requires_book_page_entry_and_transcribes_record(): void
    {
        $schedule = SacramentSchedule::create([
            'parish_id' => $this->parish->id,
            'requester_user_id' => $this->parishioner->id,
            'sacrament_type' => 'baptism',
            'title' => 'Baptism - Mateo Dela Cruz',
            'starts_at' => Carbon::now()->subHour(),
            'ends_at' => Carbon::now(),
            'status' => ScheduleStatusEnum::SCHEDULED,
            'presiding_clergy_id' => $this->clergy->id,
            'specific_data' => [
                'child_name' => 'Mateo Santos Dela Cruz',
                'dob' => '2026-02-10',
                'gender' => 'Male',
                'place_of_birth' => 'Tanauan City',
                'father_name' => 'Juan Dela Cruz',
                'mother_name' => 'Elena Santos',
                'godparents' => 'Carlos Reyes, Teresa Gomez',
            ],
        ]);

        // Attempting to complete without book citation should fail validation
        $failResponse = $this->actingAs($this->parishStaff)->post("/schedules/{$schedule->id}/status", [
            'status' => 'completed',
        ]);
        $failResponse->assertSessionHasErrors(['book_number', 'page_number', 'entry_number']);

        // Completing with handwritten register citation
        $successResponse = $this->actingAs($this->parishStaff)->post("/schedules/{$schedule->id}/status", [
            'status' => 'completed',
            'book_number' => 8,
            'page_number' => 142,
            'entry_number' => 29,
        ]);

        $successResponse->assertSessionHasNoErrors();

        $schedule->refresh();
        $this->assertEquals(ScheduleStatusEnum::COMPLETED, $schedule->status);
        $this->assertNotNull($schedule->record_id);

        $this->assertDatabaseHas('sacramental_records', [
            'id' => $schedule->record_id,
            'originating_parish_id' => $this->parish->id,
            'performed_by_clergy_id' => $this->clergy->id,
            'book_number' => 8,
            'page_number' => 142,
            'entry_number' => 29,
            'godparents' => 'Carlos Reyes, Teresa Gomez',
            'status' => 'registered',
        ]);

        $this->assertDatabaseHas('persons', [
            'first_name' => 'Mateo',
            'last_name' => 'Santos Dela Cruz',
            'father_name' => 'Juan Dela Cruz',
            'mother_name' => 'Elena Santos',
        ]);
    }

    public function test_staff_can_save_available_days_in_settings(): void
    {
        $response = $this->actingAs($this->parishStaff)->post('/schedules/settings', [
            'settings' => [
                [
                    'sacrament_type' => 'baptism',
                    'is_available' => true,
                    'allowed_days' => ['saturday', 'sunday'],
                    'time_slots' => ['08:00-09:00', '10:00-11:00'],
                ],
                [
                    'sacrament_type' => 'matrimony',
                    'is_available' => true,
                    'allowed_days' => ['friday', 'saturday'],
                    'time_slots' => ['14:00-16:00'],
                ],
            ],
        ]);

        $response->assertSessionHasNoErrors();
        $response->assertRedirect();

        $this->assertDatabaseHas('sacrament_settings', [
            'parish_id' => $this->parish->id,
            'sacrament_type' => 'baptism',
            'is_available' => true,
        ]);

        $setting = SacramentSetting::where('parish_id', $this->parish->id)->where('sacrament_type', 'baptism')->first();
        $this->assertEquals(['saturday', 'sunday'], $setting->allowed_days);
    }

    public function test_parishioner_dashboard_displays_needed_documents_notification_and_staff_reminders(): void
    {
        $schedule = SacramentSchedule::create([
            'parish_id' => $this->parish->id,
            'requester_user_id' => $this->parishioner->id,
            'sacrament_type' => 'baptism',
            'title' => 'Baptism Request - Mateo',
            'starts_at' => Carbon::tomorrow()->setTime(10, 0),
            'ends_at' => Carbon::tomorrow()->setTime(11, 0),
            'status' => ScheduleStatusEnum::PROCESSING,
            'requester_name' => 'Maria Dela Cruz',
            'certificate_submission_mode' => 'follow_up_office',
            'staff_notes' => 'Please bring the original physical copy of Ninong confirmation cert before Friday.',
            'document_checklist' => [
                'confirmation_witnesses' => true,
                'baptismal_permit' => true,
                'psa_birth_cert' => false,
            ],
        ]);

        $response = $this->actingAs($this->parishioner)->get('/portal/dashboard');

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Portal/Dashboard')
            ->has('schedules', 1)
            ->where('schedules.0.id', $schedule->id)
            ->where('schedules.0.staff_notes', 'Please bring the original physical copy of Ninong confirmation cert before Friday.')
            ->where('schedules.0.document_checklist.confirmation_witnesses', true)
            ->where('schedules.0.document_checklist.baptismal_permit', true)
            ->where('schedules.0.document_checklist.psa_birth_cert', false)
        );
    }

    public function test_attachment_view_and_download_are_securely_served(): void
    {
        Storage::fake('public');

        $filePath = 'schedule_attachments/test_confirmation.pdf';
        Storage::disk('public')->put($filePath, 'PDF-CONTENT-CANONICAL-TEST');

        $schedule = SacramentSchedule::create([
            'parish_id' => $this->parish->id,
            'requester_user_id' => $this->parishioner->id,
            'sacrament_type' => 'baptism',
            'title' => 'Baptism Request - Mateo',
            'starts_at' => Carbon::tomorrow()->setTime(10, 0),
            'ends_at' => Carbon::tomorrow()->setTime(11, 0),
            'status' => ScheduleStatusEnum::PROCESSING,
            'requester_name' => 'Maria Dela Cruz',
        ]);

        $attachment = ScheduleAttachment::create([
            'sacrament_schedule_id' => $schedule->id,
            'document_type' => 'confirmation_cert_godparents',
            'file_path' => $filePath,
        ]);

        // 1. Staff can view the attachment inline
        $staffView = $this->actingAs($this->parishStaff)->get("/schedule-attachments/{$attachment->id}/view");
        $staffView->assertOk();
        $this->assertStringContainsString('inline', $staffView->headers->get('Content-Disposition') ?? '');

        // 2. Staff can download the attachment
        $staffDownload = $this->actingAs($this->parishStaff)->get("/schedule-attachments/{$attachment->id}/download");
        $staffDownload->assertOk();
        $this->assertStringContainsString('attachment', $staffDownload->headers->get('Content-Disposition') ?? '');

        // 3. Parishioner who owns the request can view their attachment
        $ownerView = $this->actingAs($this->parishioner)->get("/schedule-attachments/{$attachment->id}/view");
        $ownerView->assertOk();

        // 4. Unauthorized other parishioner is forbidden (403)
        $otherParishioner = User::create([
            'username' => 'other_parishioner',
            'email' => 'other@rcal.ph',
            'role' => RoleEnum::PARISHIONER,
            'password' => Hash::make('password'),
            'is_active' => true,
        ]);

        $forbiddenView = $this->actingAs($otherParishioner)->get("/schedule-attachments/{$attachment->id}/view");
        $forbiddenView->assertForbidden();
    }
}
