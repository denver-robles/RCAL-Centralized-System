<?php

namespace Tests\Feature;

use App\Enums\RequestStatusEnum;
use App\Enums\RoleEnum;
use App\Enums\SacramentTypeEnum;
use App\Enums\ScheduleStatusEnum;
use App\Enums\ScheduleTypeEnum;
use App\Models\CertificateRequest;
use App\Models\Parish;
use App\Models\Person;
use App\Models\SacramentalRecord;
use App\Models\SacramentSchedule;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class DashboardControllerTest extends TestCase
{
    protected Parish $parishA;

    protected Parish $parishB;

    protected User $staffA;

    protected User $chancery;

    protected User $parishioner;

    protected function setUp(): void
    {
        parent::setUp();

        $this->parishA = Parish::factory()->create(['name' => 'Parish Alpha']);
        $this->parishB = Parish::factory()->create(['name' => 'Parish Beta']);

        $this->staffA = User::factory()->create([
            'role' => RoleEnum::PARISH_STAFF,
            'home_parish_id' => $this->parishA->id,
        ]);

        $this->chancery = User::factory()->create([
            'role' => RoleEnum::CHANCERY,
            'home_parish_id' => null,
        ]);

        $this->parishioner = User::factory()->create([
            'role' => RoleEnum::PARISHIONER,
            'home_parish_id' => null,
        ]);
    }

    public function test_guest_is_redirected_to_login_from_dashboard(): void
    {
        $this->get('/dashboard')->assertRedirect('/login');
    }

    public function test_parishioner_is_forbidden_from_staff_dashboard(): void
    {
        $this->actingAs($this->parishioner)
            ->get('/dashboard')
            ->assertStatus(403);
    }

    public function test_parish_staff_only_sees_own_parish_records_certificates_and_schedules(): void
    {
        $personA = Person::create(['first_name' => 'Juan', 'last_name' => 'Alpha', 'sex' => 'male']);
        $personB = Person::create(['first_name' => 'Pedro', 'last_name' => 'Beta', 'sex' => 'male']);

        $recordA = SacramentalRecord::create([
            'person_id' => $personA->id,
            'sacrament_type' => SacramentTypeEnum::BAPTISM,
            'event_date' => '2022-05-01',
            'book_number' => 1,
            'page_number' => 1,
            'entry_number' => 1,
            'originating_parish_id' => $this->parishA->id,
            'status' => 'registered',
        ]);

        $recordB = SacramentalRecord::create([
            'person_id' => $personB->id,
            'sacrament_type' => SacramentTypeEnum::BAPTISM,
            'event_date' => '2022-05-02',
            'book_number' => 1,
            'page_number' => 1,
            'entry_number' => 1,
            'originating_parish_id' => $this->parishB->id,
            'status' => 'registered',
        ]);

        CertificateRequest::create([
            'record_id' => $recordA->id,
            'requester_name' => 'Requester Alpha',
            'requester_contact' => '09170000001',
            'purpose' => 'Employment',
            'status' => RequestStatusEnum::PENDING,
        ]);

        CertificateRequest::create([
            'record_id' => $recordB->id,
            'requester_name' => 'Requester Beta',
            'requester_contact' => '09170000002',
            'purpose' => 'School',
            'status' => RequestStatusEnum::PENDING,
        ]);

        SacramentSchedule::create([
            'parish_id' => $this->parishA->id,
            'sacrament_type' => ScheduleTypeEnum::BAPTISM,
            'title' => 'Alpha Baptism',
            'starts_at' => now()->addDays(2),
            'ends_at' => now()->addDays(2)->addHour(),
            'status' => ScheduleStatusEnum::CONFIRMED,
        ]);

        SacramentSchedule::create([
            'parish_id' => $this->parishB->id,
            'sacrament_type' => ScheduleTypeEnum::BAPTISM,
            'title' => 'Beta Baptism',
            'starts_at' => now()->addDays(3),
            'ends_at' => now()->addDays(3)->addHour(),
            'status' => ScheduleStatusEnum::CONFIRMED,
        ]);

        $response = $this->actingAs($this->staffA)->get('/dashboard');

        $response->assertStatus(200);
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Staff/Dashboard')
            ->has('stats')
            ->has('sacramentCounts')
            ->has('urgentCertificates', 1)
            ->where('urgentCertificates.0.requester_name', 'Requester Alpha')
            ->has('upcomingSchedules', 1)
            ->where('upcomingSchedules.0.title', 'Alpha Baptism')
            ->has('recentRecords', 1)
            ->where('recentRecords.0.id', $recordA->id)
            ->where('kpiOverview.totalRecords', 1)
            ->where('kpiOverview.activeSchedules', 1)
        );
    }

    public function test_chancery_user_sees_archdiocese_wide_dashboard_data(): void
    {
        $personA = Person::create(['first_name' => 'Maria', 'last_name' => 'Alpha', 'sex' => 'female']);
        $personB = Person::create(['first_name' => 'Clara', 'last_name' => 'Beta', 'sex' => 'female']);

        $recordA = SacramentalRecord::create([
            'person_id' => $personA->id,
            'sacrament_type' => SacramentTypeEnum::BAPTISM,
            'event_date' => '2022-06-01',
            'book_number' => 2,
            'page_number' => 1,
            'entry_number' => 1,
            'originating_parish_id' => $this->parishA->id,
            'status' => 'registered',
        ]);

        $recordB = SacramentalRecord::create([
            'person_id' => $personB->id,
            'sacrament_type' => SacramentTypeEnum::CONFIRMATION,
            'event_date' => '2022-06-02',
            'book_number' => 2,
            'page_number' => 1,
            'entry_number' => 2,
            'originating_parish_id' => $this->parishB->id,
            'status' => 'registered',
        ]);

        CertificateRequest::create([
            'record_id' => $recordA->id,
            'requester_name' => 'Cert Alpha',
            'requester_contact' => '09170000003',
            'purpose' => 'Marriage',
            'status' => RequestStatusEnum::PENDING,
        ]);

        CertificateRequest::create([
            'record_id' => $recordB->id,
            'requester_name' => 'Cert Beta',
            'requester_contact' => '09170000004',
            'purpose' => 'Travel',
            'status' => RequestStatusEnum::READY,
        ]);

        SacramentSchedule::create([
            'parish_id' => $this->parishA->id,
            'sacrament_type' => ScheduleTypeEnum::BAPTISM,
            'title' => 'Alpha Schedule',
            'starts_at' => now()->addDays(2),
            'ends_at' => now()->addDays(2)->addHour(),
            'status' => ScheduleStatusEnum::CONFIRMED,
        ]);

        SacramentSchedule::create([
            'parish_id' => $this->parishB->id,
            'sacrament_type' => ScheduleTypeEnum::CONFIRMATION,
            'title' => 'Beta Schedule',
            'starts_at' => now()->addDays(4),
            'ends_at' => now()->addDays(4)->addHour(),
            'status' => ScheduleStatusEnum::CONFIRMED,
        ]);

        $response = $this->actingAs($this->chancery)->get('/dashboard');

        $response->assertStatus(200);
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Staff/Dashboard')
            ->has('urgentCertificates', 2)
            ->has('upcomingSchedules', 2)
            ->has('recentRecords', 2)
            ->where('kpiOverview.totalRecords', 2)
            ->where('kpiOverview.activeSchedules', 2)
        );
    }
}
