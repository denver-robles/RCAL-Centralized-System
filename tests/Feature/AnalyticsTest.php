<?php

namespace Tests\Feature;

use App\Enums\RoleEnum;
use App\Enums\SacramentTypeEnum;
use App\Enums\ScheduleStatusEnum;
use App\Enums\ScheduleTypeEnum;
use App\Models\Parish;
use App\Models\Person;
use App\Models\SacramentalRecord;
use App\Models\SacramentSchedule;
use App\Models\User;
use App\Models\Vicariate;
use App\Services\AnalyticsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class AnalyticsTest extends TestCase
{
    use RefreshDatabase;

    protected Parish $parish;

    protected User $staff;

    protected function setUp(): void
    {
        parent::setUp();

        $vicariate = Vicariate::create(['name' => 'Metro Vicariate']);
        $this->parish = Parish::create([
            'name' => 'Holy Family Parish',
            'vicariate_id' => $vicariate->id,
            'is_active' => true,
        ]);

        $this->staff = User::create([
            'username' => 'staff_holy_family',
            'email' => 'holyfamily@rcal.ph',
            'role' => RoleEnum::PARISH_STAFF,
            'home_parish_id' => $this->parish->id,
            'password' => Hash::make('password'),
            'is_active' => true,
        ]);
    }

    public function test_completed_sacraments_includes_canonical_records_and_other_completed_schedules(): void
    {
        $person1 = Person::create(['first_name' => 'Jose', 'last_name' => 'Rizal', 'sex' => 'male']);
        $person2 = Person::create(['first_name' => 'Andres', 'last_name' => 'Bonifacio', 'sex' => 'male']);
        $person3 = Person::create(['first_name' => 'Gregoria', 'last_name' => 'De Jesus', 'sex' => 'female']);

        // 1. Direct Baptism record
        SacramentalRecord::create([
            'originating_parish_id' => $this->parish->id,
            'person_id' => $person1->id,
            'sacrament_type' => SacramentTypeEnum::BAPTISM,
            'event_date' => now()->toDateString(),
            'book_number' => 1,
            'page_number' => 1,
            'entry_number' => 1,
            'status' => 'registered',
        ]);

        // 2. Direct Marriage record
        SacramentalRecord::create([
            'originating_parish_id' => $this->parish->id,
            'person_id' => $person2->id,
            'spouse_person_id' => $person3->id,
            'sacrament_type' => SacramentTypeEnum::MARRIAGE,
            'event_date' => now()->toDateString(),
            'book_number' => 1,
            'page_number' => 1,
            'entry_number' => 1,
            'status' => 'registered',
        ]);

        // 3. Completed non-registry schedule (Blessing) -> should go to 'others'
        SacramentSchedule::create([
            'parish_id' => $this->parish->id,
            'sacrament_type' => ScheduleTypeEnum::BLESSING,
            'title' => 'House Blessing',
            'starts_at' => now(),
            'ends_at' => now()->addHour(),
            'status' => ScheduleStatusEnum::COMPLETED,
        ]);

        $analyticsService = app(AnalyticsService::class);
        $data = $analyticsService->getSacramentAnalytics($this->parish->id);

        $completed = $data['appointments']['completed'];

        $this->assertEquals(1, $completed['baptism']);
        $this->assertEquals(0, $completed['confirmation']);
        $this->assertEquals(1, $completed['marriage']);
        $this->assertEquals(0, $completed['funeral']);
        $this->assertEquals(1, $completed['others']);
        $this->assertEquals(3, $completed['total']);
    }

    public function test_staff_can_view_analytics_with_completed_records(): void
    {
        $response = $this->actingAs($this->staff)->get('/analytics');

        $response->assertStatus(200);
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Analytics/Index')
            ->has('sacraments.appointments.completed')
        );
    }
}
