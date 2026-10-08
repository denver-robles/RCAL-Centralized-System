<?php

namespace Tests\Feature;

use App\Enums\AuditActionEnum;
use App\Enums\RoleEnum;
use App\Models\AuditLog;
use App\Models\Parish;
use App\Models\User;
use App\Models\Vicariate;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuthTest extends TestCase
{
    protected Parish $parish;

    protected function setUp(): void
    {
        parent::setUp();

        $vicariate = Vicariate::create(['name' => 'Central Vicariate']);
        $this->parish = Parish::create([
            'name' => 'St. Sebastian Cathedral',
            'vicariate_id' => $vicariate->id,
            'is_active' => true,
        ]);
    }

    public function test_login_page_renders_successfully(): void
    {
        $response = $this->get('/login');
        $response->assertStatus(200);
    }

    public function test_parishioner_can_authenticate_with_email_and_is_redirected_to_portal(): void
    {
        $user = User::create([
            'username' => 'juan_delacruz',
            'email' => 'juan@example.ph',
            'display_name' => 'Juan Dela Cruz',
            'role' => RoleEnum::PARISHIONER,
            'password' => Hash::make('password123'),
            'is_active' => true,
        ]);

        $response = $this->post('/login', [
            'identifier' => 'juan@example.ph',
            'password' => 'password123',
        ]);

        $response->assertRedirect('/portal/dashboard');
        $this->assertAuthenticatedAs($user);

        // Verify audit log created
        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $user->id,
            'action' => AuditActionEnum::LOGIN->value,
        ]);
    }

    public function test_staff_can_authenticate_with_username_and_is_redirected_to_records(): void
    {
        $staff = User::create([
            'username' => 'cathedral_staff',
            'email' => 'staff@cathedral.ph',
            'display_name' => 'Cathedral Secretary',
            'role' => RoleEnum::PARISH_STAFF,
            'home_parish_id' => $this->parish->id,
            'password' => Hash::make('secretpass'),
            'is_active' => true,
        ]);

        $response = $this->post('/login', [
            'identifier' => 'cathedral_staff',
            'password' => 'secretpass',
        ]);

        $response->assertRedirect('/records');
        $this->assertAuthenticatedAs($staff);
    }

    public function test_inactive_user_cannot_authenticate(): void
    {
        User::create([
            'username' => 'deactivated_user',
            'email' => 'inactive@example.ph',
            'role' => RoleEnum::PARISHIONER,
            'password' => Hash::make('password123'),
            'is_active' => false,
        ]);

        $response = $this->post('/login', [
            'identifier' => 'deactivated_user',
            'password' => 'password123',
        ]);

        $response->assertSessionHasErrors('identifier');
        $this->assertGuest();
    }

    public function test_invalid_credentials_logs_failed_attempt_and_fails_validation(): void
    {
        $user = User::create([
            'username' => 'valid_user',
            'email' => 'valid@example.ph',
            'role' => RoleEnum::PARISHIONER,
            'password' => Hash::make('correct_password'),
            'is_active' => true,
        ]);

        $response = $this->post('/login', [
            'identifier' => 'valid_user',
            'password' => 'wrong_password',
        ]);

        $response->assertSessionHasErrors('identifier');
        $this->assertGuest();

        $this->assertDatabaseHas('audit_logs', [
            'action' => AuditActionEnum::LOGIN_FAILED->value,
        ]);
    }

    public function test_user_can_logout_and_session_is_invalidated(): void
    {
        $user = User::create([
            'username' => 'test_user',
            'email' => 'test@example.ph',
            'role' => RoleEnum::PARISHIONER,
            'password' => Hash::make('password123'),
            'is_active' => true,
        ]);

        $this->actingAs($user);

        $response = $this->post('/logout');
        $response->assertRedirect('/login');
        $this->assertGuest();

        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $user->id,
            'action' => AuditActionEnum::LOGOUT->value,
        ]);
    }

    public function test_registration_page_renders_successfully(): void
    {
        $response = $this->get('/register');
        $response->assertStatus(200);
    }

    public function test_parishioner_can_register_new_account(): void
    {
        $response = $this->post('/register', [
            'first_name' => 'Maria',
            'middle_name' => 'Clara',
            'last_name' => 'Santos',
            'email' => 'maria.santos@parishioner.ph',
            'phone' => '09171234567',
            'home_parish_id' => $this->parish->id,
            'password' => 'secretpassword123',
            'password_confirmation' => 'secretpassword123',
            'privacy_consent' => true,
        ]);

        $response->assertRedirect('/login');
        $response->assertSessionHas('success', 'Your parishioner account has been successfully created. You may now sign in.');

        $this->assertDatabaseHas('users', [
            'email' => 'maria.santos@parishioner.ph',
            'display_name' => 'Maria Clara Santos',
            'role' => RoleEnum::PARISHIONER->value,
            'home_parish_id' => $this->parish->id,
            'phone' => '09171234567',
            'is_active' => true,
        ]);

        $createdUser = User::where('email', 'maria.santos@parishioner.ph')->first();
        $this->assertNotNull($createdUser);
        $this->assertTrue(Hash::check('secretpassword123', $createdUser->password));

        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $createdUser->id,
            'action' => AuditActionEnum::CREATE->value,
        ]);
    }

    public function test_registration_fails_with_duplicate_email(): void
    {
        User::create([
            'username' => 'existing_user',
            'email' => 'existing@example.ph',
            'role' => RoleEnum::PARISHIONER,
            'password' => Hash::make('password123'),
            'is_active' => true,
        ]);

        $response = $this->post('/register', [
            'first_name' => 'Existing',
            'last_name' => 'User',
            'email' => 'existing@example.ph',
            'phone' => '09187654321',
            'home_parish_id' => $this->parish->id,
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'privacy_consent' => true,
        ]);

        $response->assertSessionHasErrors('email');
    }

    public function test_registration_fails_without_privacy_consent(): void
    {
        $response = $this->post('/register', [
            'first_name' => 'No',
            'last_name' => 'Consent',
            'email' => 'noconsent@example.ph',
            'phone' => '09187654321',
            'home_parish_id' => $this->parish->id,
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'privacy_consent' => false,
        ]);

        $response->assertSessionHasErrors('privacy_consent');
    }
}
