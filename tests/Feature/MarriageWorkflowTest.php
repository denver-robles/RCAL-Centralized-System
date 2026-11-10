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
use App\Models\User;
use App\Models\Vicariate;
use Carbon\Carbon;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class MarriageWorkflowTest extends TestCase
{
    protected Parish $parish;

    protected User $parishStaff;

    protected User $parishioner;

    protected Clergy $clergy;

    protected function setUp(): void
    {
        parent::setUp();

        $vicariate = Vicariate::create(['name' => 'Vicariate Marriage Test']);
        $this->parish = Parish::create([
            'name' => 'Metropolitan Cathedral of San Sebastian',
            'vicariate_id' => $vicariate->id,
            'is_active' => true,
        ]);

        $this->parishStaff = User::create([
            'username' => 'staff_matrimony',
            'email' => 'staff_kasal@parish.rcal.ph',
            'role' => RoleEnum::PARISH_STAFF,
            'home_parish_id' => $this->parish->id,
            'password' => Hash::make('password'),
            'is_active' => true,
        ]);

        $this->parishioner = User::create([
            'username' => 'groom_user',
            'email' => 'groom@rcal.ph',
            'role' => RoleEnum::PARISHIONER,
            'home_parish_id' => $this->parish->id,
            'password' => Hash::make('password'),
            'phone' => '09179988776',
            'is_active' => true,
        ]);

        $this->clergy = Clergy::create([
            'first_name' => 'Alfredo',
            'last_name' => 'Madlangbayan',
            'title' => ClergyTitleEnum::MONSIGNOR,
            'sex' => 'male',
            'is_active' => true,
        ]);
    }

    public function test_parishioner_can_submit_marriage_appointment_with_groom_and_bride_details(): void
    {
        $weddingDate = Carbon::now()->addMonths(3)->next(Carbon::SATURDAY)->setTime(14, 0);

        $response = $this->actingAs($this->parishioner)->post('/portal/schedule-requests', [
            'requester_name' => 'Roberto Gomez',
            'requester_contact' => '09179988776',
            'requester_email' => 'groom@rcal.ph',
            'requester_relationship' => 'Groom',
            'requester_address' => 'Barangay Marawoy, Lipa City',
            'parish_id' => $this->parish->id,
            'sacrament_type' => 'matrimony',
            'starts_at' => $weddingDate->format('Y-m-d H:i:s'),
            'requested_clergy_id' => $this->clergy->id,
            'specific_data' => [
                'groom_name' => 'Roberto Gomez',
                'groom_dob' => '1996-05-12',
                'groom_pob' => 'Lipa City, Batangas',
                'groom_father_name' => 'Manuel Gomez',
                'groom_mother_name' => 'Carmela Reyes',
                'groom_parish' => 'San Sebastian Cathedral Parish',
                'groom_is_foreign_or_ofw' => 'no',
                'bride_name' => 'Maria Clara Santos',
                'bride_dob' => '1998-09-24',
                'bride_pob' => 'Tanauan City, Batangas',
                'bride_father_name' => 'Santiago Santos',
                'bride_mother_name' => 'Pia Alba',
                'bride_parish' => 'St. John the Evangelist Parish, Tanauan',
                'bride_is_foreign_or_ofw' => 'no',
                'witnesses' => 'Gov. Hermilando Mandanas, Cong. Vilma Santos-Recto',
            ],
        ]);

        $response->assertRedirect('/portal/dashboard');

        $this->assertDatabaseHas('sacrament_schedules', [
            'requester_user_id' => $this->parishioner->id,
            'parish_id' => $this->parish->id,
            'sacrament_type' => 'matrimony',
            'title' => 'Matrimony Request - Roberto Gomez & Maria Clara Santos',
            'certificate_submission_mode' => 'follow_up_office',
            'status' => ScheduleStatusEnum::REQUESTED->value,
        ]);

        $schedule = SacramentSchedule::where('requester_user_id', $this->parishioner->id)->firstOrFail();
        $this->assertCount(0, $schedule->attachments); // All files physically submitted
        $this->assertEquals('Roberto Gomez', $schedule->specific_data['groom_name']);
        $this->assertEquals('Maria Clara Santos', $schedule->specific_data['bride_name']);
    }

    public function test_parish_staff_can_review_marriage_and_notify_pending_checklist(): void
    {
        $weddingDate = Carbon::now()->addMonths(3)->setTime(10, 0);

        $schedule = SacramentSchedule::create([
            'requester_user_id' => $this->parishioner->id,
            'parish_id' => $this->parish->id,
            'sacrament_type' => 'matrimony',
            'title' => 'Matrimony Request - Roberto Gomez & Maria Clara Santos',
            'starts_at' => $weddingDate,
            'ends_at' => $weddingDate->copy()->addHours(2),
            'status' => ScheduleStatusEnum::REQUESTED,
            'requester_name' => 'Roberto Gomez',
            'requester_contact' => '09179988776',
            'requester_email' => 'groom@rcal.ph',
            'requester_relationship' => 'Groom',
            'requester_address' => 'Lipa City',
            'certificate_submission_mode' => 'follow_up_office',
            'specific_data' => [
                'groom_name' => 'Roberto Gomez',
                'bride_name' => 'Maria Clara Santos',
            ],
        ]);

        // Staff sets status to processing and indicates which physical documents are still needed
        $response = $this->actingAs($this->parishStaff)->post("/schedules/{$schedule->id}/status", [
            'status' => 'processing',
            'starts_at' => $weddingDate->format('Y-m-d H:i:s'),
            'ends_at' => $weddingDate->copy()->addHours(2)->format('Y-m-d H:i:s'),
            'presiding_clergy_id' => $this->clergy->id,
            'staff_notes' => 'Please attend Pre-Cana on Dec 15. Please submit PSA CENOMAR and original baptismal certificates before end of month.',
            'document_checklist' => [
                'marriage_baptismal_cert' => true,
                'marriage_confirmation_cert' => false,
                'marriage_psa_birth' => false,
                'marriage_cenomar' => true,
                'marriage_interview_form' => true,
                'marriage_banns' => true,
                'marriage_permit' => true,
                'marriage_license' => true,
                'marriage_singleness' => false,
                'marriage_precana' => true,
                'marriage_couple_pic' => false,
            ],
        ]);

        $response->assertRedirect();

        $schedule->refresh();
        $this->assertEquals(ScheduleStatusEnum::PROCESSING, $schedule->status);
        $this->assertTrue($schedule->document_checklist['marriage_cenomar']);
        $this->assertTrue($schedule->document_checklist['marriage_interview_form']);
        $this->assertTrue($schedule->document_checklist['marriage_banns']);
        $this->assertTrue($schedule->document_checklist['marriage_precana']);
        $this->assertFalse($schedule->document_checklist['marriage_psa_birth']);
        $this->assertStringContainsString('Pre-Cana on Dec 15', $schedule->staff_notes);
    }

    public function test_parish_staff_can_complete_marriage_and_transcribe_both_spouses(): void
    {
        $weddingDate = Carbon::now()->setTime(14, 0);

        $schedule = SacramentSchedule::create([
            'requester_user_id' => $this->parishioner->id,
            'parish_id' => $this->parish->id,
            'sacrament_type' => 'matrimony',
            'title' => 'Matrimony Request - Roberto Gomez & Maria Clara Santos',
            'starts_at' => $weddingDate,
            'ends_at' => $weddingDate->copy()->addHours(2),
            'status' => ScheduleStatusEnum::SCHEDULED,
            'presiding_clergy_id' => $this->clergy->id,
            'requester_name' => 'Roberto Gomez',
            'requester_contact' => '09179988776',
            'requester_email' => 'groom@rcal.ph',
            'requester_relationship' => 'Groom',
            'requester_address' => 'Lipa City',
            'specific_data' => [
                'groom_name' => 'Roberto Gomez',
                'groom_dob' => '1996-05-12',
                'groom_pob' => 'Lipa City',
                'groom_father_name' => 'Manuel Gomez',
                'groom_mother_name' => 'Carmela Reyes',
                'bride_name' => 'Maria Clara Santos',
                'bride_dob' => '1998-09-24',
                'bride_pob' => 'Tanauan City',
                'bride_father_name' => 'Santiago Santos',
                'bride_mother_name' => 'Pia Alba',
                'witnesses' => 'Gov. Mandanas, Cong. Vilma Santos',
            ],
        ]);

        $response = $this->actingAs($this->parishStaff)->post("/schedules/{$schedule->id}/status", [
            'status' => 'completed',
            'book_number' => 8,
            'page_number' => 114,
            'entry_number' => 23,
        ]);

        $response->assertRedirect();

        $schedule->refresh();
        $this->assertEquals(ScheduleStatusEnum::COMPLETED, $schedule->status);
        $this->assertNotNull($schedule->record_id);

        $record = SacramentalRecord::findOrFail($schedule->record_id);
        $this->assertEquals(SacramentTypeEnum::MARRIAGE, $record->sacrament_type);
        $this->assertEquals(8, $record->book_number);
        $this->assertEquals(114, $record->page_number);
        $this->assertEquals(23, $record->entry_number);
        $this->assertEquals($this->clergy->id, $record->performed_by_clergy_id);
        $this->assertEquals($this->parish->id, $record->originating_parish_id);

        // Verify Groom person
        $groom = $record->person;
        $this->assertEquals('Roberto', $groom->first_name);
        $this->assertEquals('Gomez', $groom->last_name);
        $this->assertEquals('male', $groom->sex);
        $this->assertEquals('1996-05-12', $groom->date_of_birth->format('Y-m-d'));
        $this->assertEquals('Manuel Gomez', $groom->father_name);
        $this->assertEquals('Carmela Reyes', $groom->mother_name);

        // Verify Bride person
        $bride = $record->spouse;
        $this->assertNotNull($bride);
        $this->assertEquals('Maria Clara', $bride->first_name);
        $this->assertEquals('Santos', $bride->last_name);
        $this->assertEquals('female', $bride->sex);
        $this->assertEquals('1998-09-24', $bride->date_of_birth->format('Y-m-d'));
        $this->assertEquals('Santiago Santos', $bride->father_name);
        $this->assertEquals('Pia Alba', $bride->mother_name);
    }

    public function test_parishioner_can_submit_streamlined_marriage_with_quotation_and_add_ons(): void
    {
        $weddingDate = Carbon::now()->addMonths(4)->next(Carbon::SATURDAY)->setTime(15, 0);

        $response = $this->actingAs($this->parishioner)->post('/portal/schedule-requests', [
            'parish_id' => $this->parish->id,
            'sacrament_type' => 'matrimony',
            'starts_at' => $weddingDate->format('Y-m-d H:i:s'),
            'requester_contact' => '09171234567',
            'requester_email' => 'couple@gmail.com',
            'requested_clergy_id' => $this->clergy->id,
            'specific_data' => [
                // Table View - Groom
                'groom_name' => 'Gabriel Alonzo',
                'groom_nationality' => 'Filipino',
                'groom_status' => 'Single',
                'groom_age' => '29',
                'groom_pob' => 'Batangas City',
                'groom_address' => 'Brgy. Kumintang Ilaya, Batangas City',
                'groom_father_name' => 'Antonio Alonzo',
                'groom_mother_name' => 'Teresa Mercado',

                // Table View - Bride
                'bride_name' => 'Isabela Dizon',
                'bride_nationality' => 'Filipino',
                'bride_status' => 'Single',
                'bride_age' => '27',
                'bride_pob' => 'Lipa City',
                'bride_address' => 'Brgy. Marawoy, Lipa City',
                'bride_father_name' => 'Ramon Dizon',
                'bride_mother_name' => 'Elena Santos',

                // Principal Sponsors (Ninong & Ninang)
                'godfather_name' => 'Gov. Hermilando Mandanas',
                'godfather_address' => 'Batangas Provincial Capitol, Batangas City',
                'godmother_name' => 'Atty. Maria Santos',
                'godmother_address' => 'Lipa City',

                // Quotation & Add-ons
                'nuptial_base_fee' => 7210,
                'nuptial_add_ons' => [
                    'live_stream' => true, // 500
                    'carpet' => true,      // 1500
                    'choir' => true,       // 1000
                    'flower_stand' => false,
                    'candle_pair' => false,
                ],
                'amount' => 10210, // 7210 + 500 + 1500 + 1000 = 10210
            ],
        ]);

        $response->assertRedirect('/portal/dashboard');

        $schedule = SacramentSchedule::where('requester_user_id', $this->parishioner->id)
            ->where('title', 'Matrimony Request - Gabriel Alonzo & Isabela Dizon')
            ->firstOrFail();

        $this->assertEquals('Matrimony Request - Gabriel Alonzo & Isabela Dizon', $schedule->title);
        $this->assertEquals('follow_up_office', $schedule->certificate_submission_mode);
        $this->assertEquals(10210.0, $schedule->amount);
        $this->assertEquals(10210.0, $schedule->donation_amount);
        $this->assertEquals('Gov. Hermilando Mandanas (Ninong), Atty. Maria Santos (Ninang)', $schedule->specific_data['witnesses']);

        // Check auto-derived DOBs
        $expectedGroomYear = (int) date('Y') - 29;
        $expectedBrideYear = (int) date('Y') - 27;
        $this->assertEquals("{$expectedGroomYear}-01-01", $schedule->specific_data['groom_dob']);
        $this->assertEquals("{$expectedBrideYear}-01-01", $schedule->specific_data['bride_dob']);

        // Check fallback requester fields
        $this->assertEquals('Gabriel Alonzo', $schedule->requester_name);
        $this->assertEquals('couple@gmail.com', $schedule->requester_email);
        $this->assertEquals('09171234567', $schedule->requester_contact);
        $this->assertEquals('Groom', $schedule->requester_relationship);
        $this->assertEquals('Brgy. Kumintang Ilaya, Batangas City', $schedule->requester_address);
    }
}
