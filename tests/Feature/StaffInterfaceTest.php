<?php

namespace Tests\Feature;

use App\Enums\RoleEnum;
use App\Enums\SacramentTypeEnum;
use App\Models\Parish;
use App\Models\Person;
use App\Models\SacramentalRecord;
use App\Models\User;
use App\Models\Vicariate;
use Illuminate\Support\Facades\Hash;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class StaffInterfaceTest extends TestCase
{
    protected Parish $parish;
    protected User $staff;
    protected User $chancery;
    protected SacramentalRecord $record;

    protected function setUp(): void
    {
        parent::setUp();

        $vicariate = Vicariate::create(['name' => 'Central Vicariate']);
        $this->parish = Parish::create(['name' => 'St. Sebastian Cathedral', 'vicariate_id' => $vicariate->id, 'is_active' => true]);

        $this->staff = User::create([
            'username' => 'staff_cathedral',
            'email' => 'cathedral@rcal.ph',
            'role' => RoleEnum::PARISH_STAFF,
            'home_parish_id' => $this->parish->id,
            'password' => Hash::make('password'),
            'is_active' => true,
        ]);

        $this->chancery = User::create([
            'username' => 'chancery_officer',
            'email' => 'chancery@rcal.ph',
            'role' => RoleEnum::CHANCERY,
            'password' => Hash::make('password'),
            'is_active' => true,
        ]);

        $person = Person::create(['first_name' => 'Juan', 'last_name' => 'Dela Cruz', 'sex' => 'male']);

        $this->record = SacramentalRecord::create([
            'person_id' => $person->id,
            'sacrament_type' => SacramentTypeEnum::BAPTISM,
            'event_date' => '2023-01-01',
            'book_number' => 1,
            'page_number' => 1,
            'entry_number' => 1,
            'originating_parish_id' => $this->parish->id,
            'status' => 'registered',
        ]);
    }

    public function test_staff_can_load_canonical_registers_interface(): void
    {
        $response = $this->actingAs($this->staff)->get('/records');

        $response->assertStatus(200);
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Records/Index')
            ->has('records')
            ->has('parishes')
            ->has('filters')
            ->has('stats')
        );
    }

    public function test_staff_can_load_record_detail_interface(): void
    {
        $response = $this->actingAs($this->staff)->get("/records/{$this->record->id}");

        $response->assertStatus(200);
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Records/Detail')
            ->has('record')
            ->has('annotationTypes')
            ->has('canWrite')
        );
    }

    public function test_staff_can_load_certificate_queue_interface(): void
    {
        $response = $this->actingAs($this->staff)->get('/certificates');

        $response->assertStatus(200);
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Certificates/Index')
            ->has('certificateRequests')
            ->has('documentRequests')
            ->has('stats')
            ->has('filters')
        );
    }

    public function test_staff_can_load_schedules_interface(): void
    {
        $response = $this->actingAs($this->staff)->get('/schedules');

        $response->assertStatus(200);
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Schedules/Index')
            ->has('schedules')
            ->has('venues')
            ->has('clergy')
            ->has('filters')
        );
    }

    public function test_chancery_can_load_audit_trail_interface(): void
    {
        $response = $this->actingAs($this->chancery)->get('/audit');

        $response->assertStatus(200);
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Audit/Index')
            ->has('auditLogs')
            ->has('accessLogs')
            ->has('filters')
        );
    }

    public function test_chancery_can_load_curia_analytics_interface(): void
    {
        $response = $this->actingAs($this->chancery)->get('/analytics');

        $response->assertStatus(200);
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Analytics/Index')
            ->has('archdioceseCounts')
            ->has('sacramentCounts')
            ->has('requestStats')
        );
    }
}
