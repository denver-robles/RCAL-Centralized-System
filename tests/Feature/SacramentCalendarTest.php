<?php

namespace Tests\Feature;

use App\Enums\ClergyTitleEnum;
use App\Enums\RoleEnum;
use App\Enums\ScheduleStatusEnum;
use App\Enums\ScheduleTypeEnum;
use App\Models\Clergy;
use App\Models\Parish;
use App\Models\SacramentSchedule;
use App\Models\User;
use App\Models\Vicariate;
use Carbon\Carbon;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class SacramentCalendarTest extends TestCase
{
    protected Parish $parish;

    protected Parish $otherParish;

    protected User $parishStaff;

    protected User $parishPriest;

    protected User $chanceryUser;

    protected User $parishioner;

    protected Clergy $clergy;

    protected function setUp(): void
    {
        parent::setUp();

        $vicariate = Vicariate::create(['name' => 'Vicariate Calendar Test']);

        $this->parish = Parish::create([
            'name' => 'St. John the Baptist Parish',
            'vicariate_id' => $vicariate->id,
            'is_active' => true,
        ]);

        $this->otherParish = Parish::create([
            'name' => 'Our Lady of Caysasay Parish',
            'vicariate_id' => $vicariate->id,
            'is_active' => true,
        ]);

        $this->parishStaff = User::create([
            'username' => 'staff_calendar',
            'email' => 'staff_cal@parish.rcal.ph',
            'role' => RoleEnum::PARISH_STAFF,
            'home_parish_id' => $this->parish->id,
            'password' => Hash::make('password'),
            'is_active' => true,
        ]);

        $this->parishPriest = User::create([
            'username' => 'priest_calendar',
            'email' => 'priest_cal@parish.rcal.ph',
            'role' => RoleEnum::CLERGY,
            'home_parish_id' => $this->parish->id,
            'password' => Hash::make('password'),
            'is_active' => true,
        ]);

        $this->chanceryUser = User::create([
            'username' => 'chancery_calendar',
            'email' => 'chancery_cal@rcal.ph',
            'role' => RoleEnum::CHANCERY,
            'password' => Hash::make('password'),
            'is_active' => true,
        ]);

        $this->parishioner = User::create([
            'username' => 'parishioner_user',
            'email' => 'parishioner@rcal.ph',
            'role' => RoleEnum::PARISHIONER,
            'home_parish_id' => $this->parish->id,
            'password' => Hash::make('password'),
            'is_active' => true,
        ]);

        $this->clergy = Clergy::create([
            'first_name' => 'Jose',
            'last_name' => 'Rizal',
            'title' => ClergyTitleEnum::FATHER,
            'sex' => 'male',
            'is_active' => true,
        ]);
    }

    public function test_parish_staff_and_parish_priest_can_access_calendar_view(): void
    {
        $response = $this->actingAs($this->parishStaff)->get('/schedules/calendar');
        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('Schedules/Calendar')
            ->has('schedules')
            ->has('parishes')
            ->has('filters')
        );

        $responsePriest = $this->actingAs($this->parishPriest)->get('/schedules/calendar');
        $responsePriest->assertStatus(200);
        $responsePriest->assertInertia(fn ($page) => $page
            ->component('Schedules/Calendar')
        );
    }

    public function test_parishioner_cannot_access_staff_calendar_view(): void
    {
        $response = $this->actingAs($this->parishioner)->get('/schedules/calendar');
        // Staff middleware blocks parishioners
        $response->assertForbidden();
    }

    public function test_calendar_displays_only_scheduled_and_completed_sacraments_in_ordered_manner(): void
    {
        $baseDate = Carbon::now()->startOfMonth()->addDays(5);

        // 1. Scheduled Baptism at 10:00 AM
        $scheduledBaptism = SacramentSchedule::create([
            'parish_id' => $this->parish->id,
            'sacrament_type' => ScheduleTypeEnum::BAPTISM,
            'title' => 'Baptism of Baby Gabriel',
            'starts_at' => $baseDate->copy()->setHour(10)->setMinute(0),
            'ends_at' => $baseDate->copy()->setHour(11)->setMinute(0),
            'status' => ScheduleStatusEnum::SCHEDULED,
            'presiding_clergy_id' => $this->clergy->id,
        ]);

        // 2. Completed Matrimony at 08:00 AM (earlier in the day)
        $completedMatrimony = SacramentSchedule::create([
            'parish_id' => $this->parish->id,
            'sacrament_type' => ScheduleTypeEnum::MATRIMONY,
            'title' => 'Matrimony of Juan & Maria',
            'starts_at' => $baseDate->copy()->setHour(8)->setMinute(0),
            'ends_at' => $baseDate->copy()->setHour(9)->setMinute(30),
            'status' => ScheduleStatusEnum::COMPLETED,
            'presiding_clergy_id' => $this->clergy->id,
        ]);

        // 3. Pending/Requested Sacrament (Must NOT appear on calendar)
        $requestedSacrament = SacramentSchedule::create([
            'parish_id' => $this->parish->id,
            'sacrament_type' => ScheduleTypeEnum::CONFIRMATION,
            'title' => 'Requested Confirmation',
            'starts_at' => $baseDate->copy()->setHour(14)->setMinute(0),
            'ends_at' => $baseDate->copy()->setHour(15)->setMinute(0),
            'status' => ScheduleStatusEnum::REQUESTED,
        ]);

        // 4. Cancelled Sacrament (Must NOT appear on calendar)
        $cancelledSacrament = SacramentSchedule::create([
            'parish_id' => $this->parish->id,
            'sacrament_type' => ScheduleTypeEnum::BLESSING,
            'title' => 'Cancelled Blessing',
            'starts_at' => $baseDate->copy()->setHour(16)->setMinute(0),
            'status' => ScheduleStatusEnum::CANCELLED,
        ]);

        $response = $this->actingAs($this->parishStaff)->get('/schedules/calendar?year='.$baseDate->year.'&month='.$baseDate->month);
        $response->assertStatus(200);

        $response->assertInertia(fn ($page) => $page
            ->component('Schedules/Calendar')
            ->has('schedules', 2) // Exactly 2: completed matrimony & scheduled baptism
            ->where('schedules.0.id', $completedMatrimony->id) // 8:00 AM must come first (ordered)
            ->where('schedules.1.id', $scheduledBaptism->id)   // 10:00 AM must come second
        );
    }

    public function test_parish_scoping_applies_to_staff_calendar(): void
    {
        $baseDate = Carbon::now()->startOfMonth()->addDays(10);

        // Ceremony in Staff's Parish
        $staffParishCeremony = SacramentSchedule::create([
            'parish_id' => $this->parish->id,
            'sacrament_type' => ScheduleTypeEnum::BAPTISM,
            'title' => 'Our Parish Baptism',
            'starts_at' => $baseDate->copy()->setHour(9)->setMinute(0),
            'status' => ScheduleStatusEnum::SCHEDULED,
        ]);

        // Ceremony in Another Parish
        $otherParishCeremony = SacramentSchedule::create([
            'parish_id' => $this->otherParish->id,
            'sacrament_type' => ScheduleTypeEnum::BAPTISM,
            'title' => 'Other Parish Baptism',
            'starts_at' => $baseDate->copy()->setHour(11)->setMinute(0),
            'status' => ScheduleStatusEnum::SCHEDULED,
        ]);

        // Staff sees only their parish
        $response = $this->actingAs($this->parishStaff)->get('/schedules/calendar?year='.$baseDate->year.'&month='.$baseDate->month);
        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->has('schedules', 1)
            ->where('schedules.0.id', $staffParishCeremony->id)
        );

        // Chancery (Archdiocese-wide) can see both parishes
        $responseChancery = $this->actingAs($this->chanceryUser)->get('/schedules/calendar?year='.$baseDate->year.'&month='.$baseDate->month);
        $responseChancery->assertStatus(200);
        $responseChancery->assertInertia(fn ($page) => $page
            ->has('schedules', 2)
        );
    }
}
