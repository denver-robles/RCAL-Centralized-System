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
use Tests\TestCase;

class ParishIsolationTest extends TestCase
{
    protected Parish $parishA;
    protected Parish $parishB;
    protected User $staffA;
    protected User $staffB;
    protected User $chanceryUser;
    protected User $parishioner;
    protected SacramentalRecord $recordA;
    protected SacramentalRecord $recordB;

    protected function setUp(): void
    {
        parent::setUp();

        $vicariate = Vicariate::create(['name' => 'Central Vicariate']);

        $this->parishA = Parish::create(['name' => 'Parish Alpha', 'vicariate_id' => $vicariate->id, 'is_active' => true]);
        $this->parishB = Parish::create(['name' => 'Parish Beta', 'vicariate_id' => $vicariate->id, 'is_active' => true]);

        $this->staffA = User::create([
            'username' => 'staff_alpha',
            'email' => 'alpha@rcal.ph',
            'role' => RoleEnum::PARISH_STAFF,
            'home_parish_id' => $this->parishA->id,
            'password' => Hash::make('password'),
            'is_active' => true,
        ]);

        $this->staffB = User::create([
            'username' => 'staff_beta',
            'email' => 'beta@rcal.ph',
            'role' => RoleEnum::PARISH_STAFF,
            'home_parish_id' => $this->parishB->id,
            'password' => Hash::make('password'),
            'is_active' => true,
        ]);

        $this->chanceryUser = User::create([
            'username' => 'chancery_officer',
            'email' => 'curia@rcal.ph',
            'role' => RoleEnum::CHANCERY,
            'password' => Hash::make('password'),
            'is_active' => true,
        ]);

        $this->parishioner = User::create([
            'username' => 'parishioner_user',
            'email' => 'public@example.ph',
            'role' => RoleEnum::PARISHIONER,
            'password' => Hash::make('password'),
            'is_active' => true,
        ]);

        $personA = Person::create(['first_name' => 'Mario', 'last_name' => 'Santos', 'sex' => 'male']);
        $personB = Person::create(['first_name' => 'Luigi', 'last_name' => 'Cruz', 'sex' => 'male']);

        $this->recordA = SacramentalRecord::create([
            'person_id' => $personA->id,
            'sacrament_type' => SacramentTypeEnum::BAPTISM,
            'event_date' => '2020-01-01',
            'book_number' => 1,
            'page_number' => 1,
            'entry_number' => 1,
            'originating_parish_id' => $this->parishA->id,
            'status' => 'registered',
        ]);

        $this->recordB = SacramentalRecord::create([
            'person_id' => $personB->id,
            'sacrament_type' => SacramentTypeEnum::BAPTISM,
            'event_date' => '2020-01-01',
            'book_number' => 1,
            'page_number' => 1,
            'entry_number' => 1,
            'originating_parish_id' => $this->parishB->id,
            'status' => 'registered',
        ]);
    }

    public function test_staff_can_view_own_parish_record(): void
    {
        $this->actingAs($this->staffA);

        $response = $this->get("/records/{$this->recordA->id}");
        $response->assertStatus(200);
    }

    public function test_staff_cannot_view_other_parish_record_and_gets_403(): void
    {
        $this->actingAs($this->staffA);

        $response = $this->get("/records/{$this->recordB->id}");
        $response->assertStatus(403);
    }

    public function test_chancery_has_archdiocese_wide_oversight_across_parishes(): void
    {
        $this->actingAs($this->chanceryUser);

        $responseA = $this->get("/records/{$this->recordA->id}");
        $responseA->assertStatus(200);

        $responseB = $this->get("/records/{$this->recordB->id}");
        $responseB->assertStatus(200);
    }

    public function test_parishioner_is_strictly_forbidden_from_internal_registers_403(): void
    {
        $this->actingAs($this->parishioner);

        $this->get('/records')->assertStatus(403);
        $this->get("/records/{$this->recordA->id}")->assertStatus(403);
        $this->get('/certificates')->assertStatus(403);
        $this->get('/audit')->assertStatus(403);
        $this->get('/analytics')->assertStatus(403);
    }

    public function test_parishioner_can_access_personal_portal(): void
    {
        $this->actingAs($this->parishioner);

        $response = $this->get('/portal/dashboard');
        $response->assertStatus(200);

        $responseCreate = $this->get('/portal/requests/create');
        $responseCreate->assertStatus(200);
    }
}
