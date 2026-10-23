<?php

namespace Tests\Feature;

use App\Enums\RoleEnum;
use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Tests\TestCase;

class PasswordResetTest extends TestCase
{
    use RefreshDatabase;

    public function test_forgot_password_page_renders_successfully(): void
    {
        $response = $this->get('/forgot-password');
        $response->assertStatus(200);
    }

    public function test_user_can_request_password_reset_token(): void
    {
        Notification::fake();

        $user = User::create([
            'username' => 'testuser',
            'email' => 'testuser@example.com',
            'display_name' => 'Test User',
            'role' => RoleEnum::PARISHIONER,
            'password' => Hash::make('oldpassword'),
            'is_active' => true,
        ]);

        $response = $this->post('/forgot-password', [
            'email' => 'testuser@example.com',
        ]);

        $response->assertSessionHas('status');
        $response->assertSessionMissing('reset_url');

        Notification::assertSentTo($user, ResetPassword::class);

        $this->assertDatabaseHas('password_reset_tokens', [
            'email' => 'testuser@example.com',
        ]);
    }

    public function test_non_existent_account_returns_identical_generic_message_preventing_enumeration(): void
    {
        Notification::fake();

        $response = $this->post('/forgot-password', [
            'email' => 'unknown_person@example.com',
        ]);

        $response->assertSessionHas('status');
        $response->assertSessionMissing('reset_url');
        Notification::assertNothingSent();
    }

    public function test_reset_password_page_renders_with_token(): void
    {
        $response = $this->get('/reset-password/sample-token-123?email=testuser@example.com');
        $response->assertStatus(200);
    }

    public function test_user_can_reset_password_with_valid_token(): void
    {
        $user = User::create([
            'username' => 'resetuser',
            'email' => 'resetuser@example.com',
            'display_name' => 'Reset User',
            'role' => RoleEnum::PARISHIONER,
            'password' => Hash::make('oldpassword'),
            'is_active' => true,
        ]);

        $token = Password::broker()->createToken($user);

        $response = $this->post('/reset-password', [
            'token' => $token,
            'email' => 'resetuser@example.com',
            'password' => 'newsecretpassword123',
            'password_confirmation' => 'newsecretpassword123',
        ]);

        $response->assertRedirect('/login');
        $response->assertSessionHas('success');

        // Token should be consumed/deleted
        $this->assertDatabaseMissing('password_reset_tokens', [
            'email' => 'resetuser@example.com',
        ]);

        // User should be able to authenticate with new password
        $user->refresh();
        $this->assertTrue(Hash::check('newsecretpassword123', $user->password));
    }

    public function test_user_cannot_reset_password_with_invalid_token(): void
    {
        $user = User::create([
            'username' => 'invalidtokenuser',
            'email' => 'invalid@example.com',
            'display_name' => 'Invalid User',
            'role' => RoleEnum::PARISHIONER,
            'password' => Hash::make('oldpassword'),
            'is_active' => true,
        ]);

        Password::broker()->createToken($user);

        $response = $this->post('/reset-password', [
            'token' => 'wrong-token',
            'email' => 'invalid@example.com',
            'password' => 'newsecretpassword123',
            'password_confirmation' => 'newsecretpassword123',
        ]);

        $response->assertSessionHasErrors('email');
    }
}
