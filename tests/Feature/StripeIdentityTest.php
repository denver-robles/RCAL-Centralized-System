<?php

namespace Tests\Feature;

use App\Enums\RoleEnum;
use App\Models\Parish;
use App\Models\User;
use App\Models\Vicariate;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StripeIdentityTest extends TestCase
{
    use RefreshDatabase;

    protected User $parishioner;
    protected Parish $parish;

    protected function setUp(): void
    {
        parent::setUp();

        $vicariate = Vicariate::create([
            'name' => 'Vicariate I - St. Francis Xavier',
            'code' => 'VIC-01',
        ]);

        $this->parish = Parish::create([
            'vicariate_id' => $vicariate->id,
            'name' => 'San Sebastian Cathedral Parish',
            'city_municipality' => 'Lipa City',
            'is_active' => true,
        ]);

        $this->parishioner = User::create([
            'username' => 'test.parishioner',
            'email' => 'parishioner@example.com',
            'display_name' => 'Test Parishioner',
            'role' => RoleEnum::PARISHIONER,
            'password' => bcrypt('password123'),
            'home_parish_id' => $this->parish->id,
            'is_active' => true,
            'identity_status' => 'unverified',
        ]);
    }

    public function test_guest_cannot_access_identity_verification_pages(): void
    {
        $this->get('/identity/verify')->assertRedirect('/login');
        $this->get('/identity/status')->assertRedirect('/login');
        $this->post('/identity/create-session')->assertRedirect('/login');
    }

    public function test_authenticated_user_can_access_onboarding_page(): void
    {
        $response = $this->actingAs($this->parishioner)->get('/identity/verify');
        $response->assertOk();
    }

    public function test_authenticated_user_can_access_status_page(): void
    {
        $response = $this->actingAs($this->parishioner)->get('/identity/status');
        $response->assertOk();
    }

    public function test_create_session_returns_error_when_stripe_key_is_unconfigured(): void
    {
        config(['services.stripe.secret' => 'sk_test_...']);

        $response = $this->actingAs($this->parishioner)->postJson('/identity/create-session');
        $response->assertStatus(422)
            ->assertJsonStructure(['error']);
    }

    public function test_webhook_rejects_invalid_signature(): void
    {
        $response = $this->post('/stripe/webhook', ['some' => 'payload'], [
            'Stripe-Signature' => 'invalid_signature',
        ]);

        // Returns 400 invalid signature without 419 CSRF mismatch
        $response->assertStatus(400);
    }
}
