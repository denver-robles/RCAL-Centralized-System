<?php

namespace Tests\Feature;

use App\Enums\ClergyTitleEnum;
use App\Enums\RoleEnum;
use App\Enums\ScheduleStatusEnum;
use App\Models\Clergy;
use App\Models\Parish;
use App\Models\SacramentSchedule;
use App\Models\User;
use App\Models\Vicariate;
use Carbon\Carbon;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class DepartedWorkflowTest extends TestCase
{
    protected Parish $parish;

    protected User $parishStaff;

    protected User $parishioner;

    protected Clergy $clergy;

    protected function setUp(): void
    {
        parent::setUp();

        $vicariate = Vicariate::create(['name' => 'Vicariate Departed Test']);
        $this->parish = Parish::create([
            'name' => 'San Sebastian Cathedral',
            'vicariate_id' => $vicariate->id,
            'is_active' => true,
        ]);

        $this->parishStaff = User::create([
            'username' => 'staff_departed',
            'email' => 'staff_departed@parish.rcal.ph',
            'role' => RoleEnum::PARISH_STAFF,
            'home_parish_id' => $this->parish->id,
            'password' => Hash::make('password'),
            'is_active' => true,
        ]);

        $this->parishioner = User::create([
            'username' => 'informant_user',
            'email' => 'informant@rcal.ph',
            'role' => RoleEnum::PARISHIONER,
            'home_parish_id' => $this->parish->id,
            'password' => Hash::make('password'),
            'phone' => '09171234567',
            'is_active' => true,
        ]);

        $this->clergy = Clergy::create([
            'first_name' => 'Jose',
            'last_name' => 'Mercado',
            'title' => ClergyTitleEnum::FATHER,
            'sex' => 'male',
            'is_active' => true,
        ]);
    }

    public function test_parishioner_can_submit_mass_and_blessing_for_departed_schedule_request(): void
    {
        $massDate = Carbon::now()->addDays(5)->setTime(10, 0);

        $response = $this->actingAs($this->parishioner)->post('/portal/schedule-requests', [
            'parish_id' => $this->parish->id,
            'sacrament_type' => 'funeral',
            'starts_at' => $massDate->format('Y-m-d H:i:s'),
            'requested_clergy_id' => $this->clergy->id,
            'requester_name' => 'Maria Santos',
            'requester_contact' => '09171234567',
            'requester_relationship' => 'Anak',
            'requester_address' => 'Barangay Sabang, Lipa City',
            'specific_data' => [
                'service_mass' => true,
                'service_blessing' => true,
                'date_of_death' => Carbon::now()->subDays(2)->format('Y-m-d'),
                'spouse_name' => 'Juan Dela Cruz',
                'mass_location' => 'Parish Church / Simbahan',
                'informant_name' => 'Maria Santos',
                'informant_contact' => '09171234567',
                'deceased_name' => 'Clara Reyes Dela Cruz',
                'deceased_address' => 'Barangay Sabang, Lipa City',
                'deceased_age' => '72',
                'children_count' => '4',
                'deceased_civil_status' => 'Married',
                'cause_of_death' => 'Cardiopulmonary arrest',
                'character_traits' => 'Mapagmahal na ina, masipag na guro, laging tapat sa pagdarasal ng Santo Rosaryo.',
                'favorite_family_hobby' => 'Nagluluto ng kakanin tuwing Linggo kasama ang mga apo.',
                'received_anointing_before_death' => 'yes',
                'burial_date' => Carbon::now()->addDays(7)->setTime(14, 0)->format('Y-m-d\TH:i'),
                'burial_location' => 'Lipa Catholic Cemetery',
            ],
        ]);

        $response->assertRedirect('/portal/dashboard');
        $response->assertSessionHas('success');

        $schedule = SacramentSchedule::where('requester_user_id', $this->parishioner->id)
            ->where('sacrament_type', 'funeral')
            ->first();

        $this->assertNotNull($schedule);
        $this->assertSame('Mass & Blessing for Departed - Clara Reyes Dela Cruz', $schedule->title);
        $this->assertSame('follow_up_office', $schedule->certificate_submission_mode);
        $this->assertSame('Maria Santos', $schedule->requester_name);
        $this->assertSame('09171234567', $schedule->requester_contact);
        $this->assertSame($this->clergy->id, $schedule->requested_clergy_id);

        $specific = $schedule->specific_data;
        $this->assertTrue($specific['service_mass']);
        $this->assertTrue($specific['service_blessing']);
        $this->assertSame('Clara Reyes Dela Cruz', $specific['deceased_name']);
        $this->assertSame('Juan Dela Cruz', $specific['spouse_name']);
        $this->assertSame('72', $specific['deceased_age']);
        $this->assertSame('4', $specific['children_count']);
        $this->assertSame('Parish Church / Simbahan', $specific['mass_location']);
        $this->assertSame('Cardiopulmonary arrest', $specific['cause_of_death']);
        $this->assertStringContainsString('Mapagmahal na ina', $specific['character_traits']);
        $this->assertStringContainsString('Nagluluto ng kakanin', $specific['favorite_family_hobby']);
        $this->assertSame('yes', $specific['received_anointing_before_death']);
        $this->assertNotEmpty($specific['burial_date']);
        $this->assertSame('Lipa Catholic Cemetery', $specific['burial_location']);
    }

    public function test_parishioner_can_submit_blessing_only_for_departed(): void
    {
        $blessingDate = Carbon::now()->addDays(3)->setTime(15, 0);

        $response = $this->actingAs($this->parishioner)->post('/portal/schedule-requests', [
            'parish_id' => $this->parish->id,
            'sacrament_type' => 'funeral',
            'starts_at' => $blessingDate->format('Y-m-d H:i:s'),
            'requester_name' => 'Pedro Garcia',
            'requester_contact' => '09228887766',
            'specific_data' => [
                'service_mass' => false,
                'service_blessing' => true,
                'date_of_death' => Carbon::now()->subDays(1)->format('Y-m-d'),
                'mass_location' => 'St. Peter Funeral Homes, Lipa City',
                'deceased_name' => 'Antonio Garcia',
                'deceased_address' => 'Poblacion, Lipa City',
                'deceased_age' => '58',
                'deceased_civil_status' => 'Single',
                'cause_of_death' => 'Pneumonia',
            ],
        ]);

        $response->assertRedirect('/portal/dashboard');

        $schedule = SacramentSchedule::where('requester_user_id', $this->parishioner->id)
            ->where('sacrament_type', 'funeral')
            ->latest('id')
            ->first();

        $this->assertNotNull($schedule);
        $this->assertSame('Blessing for Departed - Antonio Garcia', $schedule->title);
        $this->assertFalse($schedule->specific_data['service_mass']);
        $this->assertTrue($schedule->specific_data['service_blessing']);
    }

    public function test_parish_staff_can_process_and_approve_departed_appointment(): void
    {
        $massDate = Carbon::now()->addDays(4)->setTime(9, 0);

        $schedule = SacramentSchedule::create([
            'requester_user_id' => $this->parishioner->id,
            'parish_id' => $this->parish->id,
            'sacrament_type' => 'funeral',
            'title' => 'Mass for Departed - Clara Reyes Dela Cruz',
            'starts_at' => $massDate,
            'ends_at' => $massDate->copy()->addHour(),
            'status' => ScheduleStatusEnum::REQUESTED,
            'requester_name' => 'Maria Santos',
            'requester_contact' => '09171234567',
            'requester_relationship' => 'Anak',
            'requester_address' => 'Barangay Sabang, Lipa City',
            'certificate_submission_mode' => 'follow_up_office',
            'specific_data' => [
                'service_mass' => true,
                'service_blessing' => false,
                'deceased_name' => 'Clara Reyes Dela Cruz',
                'date_of_death' => Carbon::now()->subDays(3)->format('Y-m-d'),
                'deceased_age' => '72',
                'mass_location' => 'Parish Church',
            ],
        ]);

        $response = $this->actingAs($this->parishStaff)->post("/schedules/{$schedule->id}/status", [
            'status' => ScheduleStatusEnum::SCHEDULED->value,
            'starts_at' => $massDate->format('Y-m-d H:i:s'),
            'presiding_clergy_id' => $this->clergy->id,
            'staff_notes' => 'Death Certificate verified at parish office. Presiding priest assigned.',
            'document_checklist' => [
                'death_certificate' => true,
                'informant_valid_id' => true,
            ],
        ]);

        $response->assertRedirect();
        $response->assertSessionHas('success');

        $schedule->refresh();
        $this->assertSame(ScheduleStatusEnum::SCHEDULED, $schedule->status);
        $this->assertSame($this->clergy->id, $schedule->presiding_clergy_id);
        $this->assertTrue($schedule->document_checklist['death_certificate']);
        $this->assertTrue($schedule->document_checklist['informant_valid_id']);
    }

    public function test_parishioner_can_request_manual_entry_visiting_priest_and_staff_inscribes_into_directory(): void
    {
        $massDate = Carbon::now()->addDays(5)->setTime(11, 0);

        // 1. Parishioner requests a guest priest not in the list
        $response = $this->actingAs($this->parishioner)->post('/portal/schedule-requests', [
            'parish_id' => $this->parish->id,
            'sacrament_type' => 'funeral',
            'starts_at' => $massDate->format('Y-m-d H:i:s'),
            'requested_clergy_id' => 'other',
            'requester_name' => 'Eduardo Ramos',
            'requester_contact' => '09181234567',
            'specific_data' => [
                'service_mass' => true,
                'service_blessing' => false,
                'deceased_name' => 'Teresa Ramos',
                'date_of_death' => Carbon::now()->subDays(2)->format('Y-m-d'),
                'mass_location' => 'Parish Church',
                'guest_priest_name' => 'Rev. Fr. Danilo Pineda, SDB',
                'requested_guest_priest_name' => 'Rev. Fr. Danilo Pineda, SDB',
            ],
        ]);

        $response->assertRedirect('/portal/dashboard');

        $schedule = SacramentSchedule::where('requester_user_id', $this->parishioner->id)
            ->where('sacrament_type', 'funeral')
            ->latest('id')
            ->first();

        $this->assertNotNull($schedule);
        $this->assertNull($schedule->requested_clergy_id);
        $this->assertSame('Rev. Fr. Danilo Pineda, SDB', $schedule->specific_data['guest_priest_name']);

        // 2. Staff confirms schedule with the guest priest and inscribes them into Clergy Directory
        $processResponse = $this->actingAs($this->parishStaff)->post("/schedules/{$schedule->id}/status", [
            'status' => ScheduleStatusEnum::SCHEDULED->value,
            'starts_at' => $massDate->format('Y-m-d H:i:s'),
            'presiding_clergy_id' => 'guest',
            'guest_priest_name' => 'Rev. Fr. Danilo Pineda, SDB',
            'add_to_clergy_directory' => true,
        ]);

        $processResponse->assertRedirect();

        $schedule->refresh();
        $this->assertSame(ScheduleStatusEnum::SCHEDULED, $schedule->status);
        $this->assertNotNull($schedule->presiding_clergy_id);

        $newClergy = Clergy::find($schedule->presiding_clergy_id);
        $this->assertNotNull($newClergy);
        $this->assertSame('Danilo', $newClergy->first_name);
        $this->assertSame('Pineda', $newClergy->last_name);
        $this->assertSame('SDB', $newClergy->suffix);
        $this->assertSame('Rev. Fr. Danilo Pineda, SDB', $newClergy->titled_name);
    }

    public function test_archdiocesan_clergy_directory_has_categories_and_bishops(): void
    {
        $bishop = Clergy::where('last_name', 'Garcera')->first();
        $this->assertNotNull($bishop);
        $this->assertSame('Bishops (Most Reverend)', $bishop->category);
        $this->assertStringContainsString('Most Rev.', $bishop->titled_name);

        $msgr = Clergy::where('last_name', 'Mandanas')->first();
        $this->assertNotNull($msgr);
        $this->assertSame('Monsignors (Reverend Monsignor)', $msgr->category);
        $this->assertStringContainsString('Rev. Msgr.', $msgr->titled_name);

        $osj = Clergy::where('last_name', 'Rosal')->first();
        $this->assertNotNull($osj);
        $this->assertSame('Religious Order Priests', $osj->category);
        $this->assertStringContainsString('OSJ', $osj->titled_name);
    }

    public function test_parishioner_can_submit_sponsored_mass_request_with_addons(): void
    {
        $massDate = Carbon::now()->addDays(10)->setTime(9, 0);

        $response = $this->actingAs($this->parishioner)->post('/portal/schedule-requests', [
            'parish_id' => $this->parish->id,
            'sacrament_type' => 'sponsored_mass',
            'starts_at' => $massDate->format('Y-m-d H:i:s'),
            'requested_clergy_id' => $this->clergy->id,
            'requester_name' => 'Teresa Reyes',
            'requester_contact' => '09187654321',
            'requester_address' => 'Brgy. Mataasnakahoy, Batangas',
            'specific_data' => [
                'sponsored_thanksgiving' => true,
                'sponsored_thanksgiving_of' => 'Reyes Family',
                'sponsored_birthday' => true,
                'sponsored_birthday_of' => 'Antonio Reyes (60th Birthday)',
                'mass_location' => 'Parish Main Altar',
                'sponsored_livestream' => true,
                'sponsored_choir' => true,
            ],
        ]);

        $response->assertRedirect('/portal/dashboard');

        $schedule = SacramentSchedule::where('requester_user_id', $this->parishioner->id)
            ->where('sacrament_type', 'sponsored_mass')
            ->latest('id')
            ->first();

        $this->assertNotNull($schedule);
        $this->assertStringContainsString('Sponsored Mass', $schedule->title);
        $this->assertStringContainsString('Thanksgiving (Reyes Family)', $schedule->title);
        $this->assertStringContainsString('Birthday (Antonio Reyes (60th Birthday))', $schedule->title);
        $this->assertSame('Teresa Reyes', $schedule->requester_name);
        $this->assertSame('follow_up_office', $schedule->certificate_submission_mode);
        // Base 2000 + Livestream 500 + Choir 1000 = 3500
        $this->assertEquals(3500, $schedule->specific_data['amount']);
        $this->assertEquals(3500, $schedule->specific_data['donation_amount']);
    }

    public function test_parishioner_can_submit_bone_and_ash_transfer_request(): void
    {
        $blessingDate = Carbon::now()->addDays(8)->setTime(14, 0);

        $response = $this->actingAs($this->parishioner)->post('/portal/schedule-requests', [
            'parish_id' => $this->parish->id,
            'sacrament_type' => 'bone_transfer',
            'starts_at' => $blessingDate->format('Y-m-d H:i:s'),
            'requested_clergy_id' => $this->clergy->id,
            'requester_name' => 'Eduardo Dimayuga',
            'requester_contact' => '09199887766',
            'requester_address' => 'Brgy. San Carlos, Lipa City',
            'specific_data' => [
                'date_today' => Carbon::now()->format('Y-m-d'),
                'target_cemetery' => 'Lipa Memorial Park',
                'deceased_name' => 'Gaudencio Dimayuga',
                'deceased_age' => '80',
                'deceased_civil_status' => 'Married',
                'children_count' => '6',
                'deceased_address' => 'Brgy. San Carlos, Lipa City',
            ],
        ]);

        $response->assertRedirect('/portal/dashboard');

        $schedule = SacramentSchedule::where('requester_user_id', $this->parishioner->id)
            ->where('sacrament_type', 'bone_transfer')
            ->latest('id')
            ->first();

        $this->assertNotNull($schedule);
        $this->assertStringContainsString('Bone / Ash Transfer - Gaudencio Dimayuga', $schedule->title);
        $this->assertSame('Eduardo Dimayuga', $schedule->requester_name);
        $this->assertSame('follow_up_office', $schedule->certificate_submission_mode);
        $this->assertEquals(100, $schedule->specific_data['amount']);
        $this->assertSame('Lipa Memorial Park', $schedule->specific_data['target_cemetery']);
    }

    public function test_parishioner_can_submit_blessing_request_with_exact_address(): void
    {
        $blessingDate = Carbon::now()->addDays(4)->setTime(16, 0);

        $response = $this->actingAs($this->parishioner)->post('/portal/schedule-requests', [
            'parish_id' => $this->parish->id,
            'sacrament_type' => 'blessing',
            'starts_at' => $blessingDate->format('Y-m-d H:i:s'),
            'requested_clergy_id' => $this->clergy->id,
            'requester_name' => 'Clarissa Mercado',
            'requester_contact' => '09223344556',
            'requester_address' => 'Brgy. Marawoy, Lipa City',
            'specific_data' => [
                'blessing_category' => 'House Blessing',
                'venue_type' => 'Off-site/At the specified address',
                'complete_address' => 'Block 5, Lot 12, St. Therese Subdivision, Lipa City',
                'transport_arrangement' => 'Requestor will pick up/drop off the priest',
            ],
        ]);

        $response->assertRedirect('/portal/dashboard');

        $schedule = SacramentSchedule::where('requester_user_id', $this->parishioner->id)
            ->where('sacrament_type', 'blessing')
            ->latest('id')
            ->first();

        $this->assertNotNull($schedule);
        $this->assertStringContainsString('Blessing - House Blessing', $schedule->title);
        $this->assertSame('Clarissa Mercado', $schedule->requester_name);
        $this->assertSame('Block 5, Lot 12, St. Therese Subdivision, Lipa City', $schedule->specific_data['complete_address']);
        $this->assertSame('follow_up_office', $schedule->certificate_submission_mode);
        $this->assertEquals(100, $schedule->specific_data['amount']);
    }
}
