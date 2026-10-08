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
use App\Models\Venue;
use App\Models\Vicariate;
use App\Services\SacramentScheduleService;
use Carbon\Carbon;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class SacramentScheduleConflictTest extends TestCase
{
    protected Parish $parish;
    protected Venue $venueMain;
    protected Venue $venueChapel;
    protected Clergy $priest;
    protected User $staff;
    protected SacramentScheduleService $scheduleService;

    protected function setUp(): void
    {
        parent::setUp();

        $vicariate = Vicariate::create(['name' => 'Central Vicariate']);
        $this->parish = Parish::create(['name' => 'St. Sebastian Cathedral', 'vicariate_id' => $vicariate->id, 'is_active' => true]);

        $this->venueMain = Venue::create(['parish_id' => $this->parish->id, 'name' => 'Main Sanctuary', 'is_active' => true]);
        $this->venueChapel = Venue::create(['parish_id' => $this->parish->id, 'name' => 'Side Chapel', 'is_active' => true]);

        $this->priest = Clergy::create([
            'first_name' => 'Jose',
            'last_name' => 'Panganiban',
            'title' => ClergyTitleEnum::MONSIGNOR,
            'sex' => 'male',
            'is_active' => true,
        ]);

        $this->staff = User::create([
            'username' => 'calendar_secretary',
            'email' => 'calendar@rcal.ph',
            'role' => RoleEnum::PARISH_STAFF,
            'home_parish_id' => $this->parish->id,
            'password' => Hash::make('password'),
            'is_active' => true,
        ]);

        $this->scheduleService = app(SacramentScheduleService::class);
    }

    public function test_overlapping_venue_schedule_triggers_conflict_validation(): void
    {
        // Existing confirmed booking: 10:00 to 11:30
        $this->scheduleService->bookSacrament([
            'parish_id' => $this->parish->id,
            'venue_id' => $this->venueMain->id,
            'presiding_clergy_id' => $this->priest->id,
            'sacrament_type' => ScheduleTypeEnum::BAPTISM->value,
            'title' => 'Baptism Ceremony 1',
            'starts_at' => '2026-11-20 10:00:00',
            'ends_at' => '2026-11-20 11:30:00',
            'status' => ScheduleStatusEnum::CONFIRMED,
        ], $this->staff);

        // Clashing attempt: 10:30 to 12:00 in the same venue
        $this->expectException(ValidationException::class);
        $this->scheduleService->bookSacrament([
            'parish_id' => $this->parish->id,
            'venue_id' => $this->venueMain->id,
            'sacrament_type' => ScheduleTypeEnum::WEDDING->value,
            'title' => 'Conflicting Nuptials',
            'starts_at' => '2026-11-20 10:30:00',
            'ends_at' => '2026-11-20 12:00:00',
        ], $this->staff);
    }

    public function test_back_to_back_appointments_do_not_clash(): void
    {
        // 10:00 to 11:00
        $first = $this->scheduleService->bookSacrament([
            'parish_id' => $this->parish->id,
            'venue_id' => $this->venueMain->id,
            'sacrament_type' => ScheduleTypeEnum::BAPTISM->value,
            'title' => 'Baptism Event',
            'starts_at' => '2026-11-20 10:00:00',
            'ends_at' => '2026-11-20 11:00:00',
            'status' => ScheduleStatusEnum::CONFIRMED,
        ], $this->staff);

        // Back-to-back: 11:00 to 12:00
        $second = $this->scheduleService->bookSacrament([
            'parish_id' => $this->parish->id,
            'venue_id' => $this->venueMain->id,
            'sacrament_type' => ScheduleTypeEnum::CONFIRMATION->value,
            'title' => 'Confirmation Rite',
            'starts_at' => '2026-11-20 11:00:00',
            'ends_at' => '2026-11-20 12:00:00',
            'status' => ScheduleStatusEnum::CONFIRMED,
        ], $this->staff);

        $this->assertNotNull($first->id);
        $this->assertNotNull($second->id);
    }

    public function test_different_venues_and_different_clergy_can_coexist(): void
    {
        $priest2 = Clergy::create([
            'first_name' => 'Pedro',
            'last_name' => 'Perez',
            'title' => ClergyTitleEnum::FATHER,
            'sex' => 'male',
            'is_active' => true,
        ]);

        // Event in Main Sanctuary with Priest 1
        $event1 = $this->scheduleService->bookSacrament([
            'parish_id' => $this->parish->id,
            'venue_id' => $this->venueMain->id,
            'presiding_clergy_id' => $this->priest->id,
            'sacrament_type' => ScheduleTypeEnum::WEDDING->value,
            'title' => 'Main Sanctuary Nuptials',
            'starts_at' => '2026-11-20 14:00:00',
            'ends_at' => '2026-11-20 15:30:00',
            'status' => ScheduleStatusEnum::CONFIRMED,
        ], $this->staff);

        // Simultaneous event in Side Chapel with Priest 2
        $event2 = $this->scheduleService->bookSacrament([
            'parish_id' => $this->parish->id,
            'venue_id' => $this->venueChapel->id,
            'presiding_clergy_id' => $priest2->id,
            'sacrament_type' => ScheduleTypeEnum::BAPTISM->value,
            'title' => 'Side Chapel Baptism',
            'starts_at' => '2026-11-20 14:00:00',
            'ends_at' => '2026-11-20 15:00:00',
            'status' => ScheduleStatusEnum::CONFIRMED,
        ], $this->staff);

        $this->assertNotNull($event1->id);
        $this->assertNotNull($event2->id);
    }

    public function test_strict_invariant_mass_intentions_are_forbidden(): void
    {
        $this->expectException(\DomainException::class);
        $this->expectExceptionMessage('Strict Prohibition: Mass Intentions are forbidden by RCAL project guidelines.');

        $this->scheduleService->bookSacrament([
            'parish_id' => $this->parish->id,
            'sacrament_type' => 'mass_intention',
            'title' => 'Forbidden Intention',
            'starts_at' => '2026-11-20 06:00:00',
            'ends_at' => '2026-11-20 07:00:00',
        ], $this->staff);
    }
}
