<?php

namespace Tests\Feature;

use App\Enums\RoleEnum;
use App\Models\Parish;
use App\Models\User;
use App\Models\Vicariate;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class FaceLoginTest extends TestCase
{
    use RefreshDatabase;

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

    public function test_face_login_requires_email_and_captured_image(): void
    {
        $response = $this->post('/login/face', []);

        $response->assertSessionHasErrors(['email', 'captured_image']);
    }

    public function test_face_login_fails_when_user_does_not_exist(): void
    {
        $response = $this->post('/login/face', [
            'email' => 'nonexistent@example.com',
            'captured_image' => 'dGVzdGltYWdlYmFzZTY0',
        ]);

        $response->assertSessionHasErrors(['email']);
    }

    public function test_face_login_fails_when_user_has_no_face_reference_enrolled(): void
    {
        $user = User::create([
            'username' => 'admin_test',
            'email' => 'admin@example.com',
            'display_name' => 'Admin Test',
            'role' => RoleEnum::ADMIN,
            'parish_id' => $this->parish->id,
            'password' => Hash::make('password123'),
            'is_active' => true,
            'face_reference_image' => null,
        ]);

        $response = $this->post('/login/face', [
            'email' => $user->email,
            'captured_image' => 'dGVzdGltYWdlYmFzZTY0',
        ]);

        $response->assertSessionHasErrors(['captured_image']);
        $this->assertGuest();
    }

    public function test_face_login_fails_when_api_key_is_unconfigured(): void
    {
        Config::set('services.facepp.key', 'your_api_key_here');
        Config::set('services.facepp.secret', 'your_api_secret_here');

        $user = User::create([
            'username' => 'admin_test',
            'email' => 'admin@example.com',
            'display_name' => 'Admin Test',
            'role' => RoleEnum::ADMIN,
            'parish_id' => $this->parish->id,
            'password' => Hash::make('password123'),
            'is_active' => true,
            'face_reference_image' => 'cmVmZXJlbmNlX2ltYWdlX2Jhc2U2NA==',
        ]);

        $response = $this->post('/login/face', [
            'email' => $user->email,
            'captured_image' => 'Y2FwdHVyZWRfaW1hZ2VfYmFzZTY0',
        ]);

        $response->assertSessionHasErrors(['captured_image']);
        $this->assertGuest();
    }

    public function test_face_login_fails_when_facepp_returns_error(): void
    {
        Config::set('services.facepp.key', 'mock_valid_key');
        Config::set('services.facepp.secret', 'mock_valid_secret');

        Http::fake([
            'https://api-us.faceplusplus.com/facepp/v3/compare' => Http::response([
                'error_message' => 'NO_FACE_FOUND',
            ], 200),
        ]);

        $user = User::create([
            'username' => 'admin_test',
            'email' => 'admin@example.com',
            'display_name' => 'Admin Test',
            'role' => RoleEnum::ADMIN,
            'parish_id' => $this->parish->id,
            'password' => Hash::make('password123'),
            'is_active' => true,
            'face_reference_image' => 'cmVmZXJlbmNlX2ltYWdl',
        ]);

        $response = $this->post('/login/face', [
            'email' => $user->email,
            'captured_image' => 'Y2FwdHVyZWRfaW1hZ2U=',
        ]);

        $response->assertSessionHasErrors(['captured_image']);
        $this->assertGuest();
    }

    public function test_face_login_fails_when_confidence_is_below_threshold(): void
    {
        Config::set('services.facepp.key', 'mock_valid_key');
        Config::set('services.facepp.secret', 'mock_valid_secret');

        Http::fake([
            'https://api-us.faceplusplus.com/facepp/v3/compare' => Http::response([
                'confidence' => 45.2,
                'thresholds' => [
                    '1e-3' => 65.3,
                    '1e-4' => 70.1,
                    '1e-5' => 75.3,
                ],
            ], 200),
        ]);

        $user = User::create([
            'username' => 'admin_test',
            'email' => 'admin@example.com',
            'display_name' => 'Admin Test',
            'role' => RoleEnum::ADMIN,
            'parish_id' => $this->parish->id,
            'password' => Hash::make('password123'),
            'is_active' => true,
            'face_reference_image' => 'cmVmZXJlbmNlX2ltYWdl',
        ]);

        $response = $this->post('/login/face', [
            'email' => $user->email,
            'captured_image' => 'Y2FwdHVyZWRfaW1hZ2U=',
        ]);

        $response->assertSessionHasErrors(['captured_image']);
        $this->assertGuest();
    }

    public function test_face_login_succeeds_when_confidence_exceeds_threshold(): void
    {
        Config::set('services.facepp.key', 'mock_valid_key');
        Config::set('services.facepp.secret', 'mock_valid_secret');

        Http::fake([
            'https://api-us.faceplusplus.com/facepp/v3/detect' => Http::response([
                'faces' => [
                    [
                        'face_token' => 'mock_token',
                        'attributes' => [
                            'facequality' => ['value' => 88.5, 'threshold' => 50.0],
                            'blur' => ['blurness' => ['value' => 12.0]],
                            'eyestatus' => [
                                'left_eye_status' => ['normal_glass_eye_open' => 99.0, 'normal_glass_eye_close' => 0.0, 'occlusion' => 0.0],
                                'right_eye_status' => ['normal_glass_eye_open' => 99.0, 'normal_glass_eye_close' => 0.0, 'occlusion' => 0.0],
                            ],
                            'headpose' => ['pitch_angle' => 2.0, 'yaw_angle' => -1.0, 'roll_angle' => 0.5],
                        ],
                    ],
                ],
            ], 200),
            'https://api-us.faceplusplus.com/facepp/v3/compare' => Http::response([
                'confidence' => 96.8,
                'thresholds' => [
                    '1e-3' => 65.3,
                    '1e-4' => 70.1,
                    '1e-5' => 75.3,
                ],
            ], 200),
        ]);

        $user = User::create([
            'username' => 'admin_test',
            'email' => 'admin@example.com',
            'display_name' => 'Admin Test',
            'role' => RoleEnum::ADMIN,
            'parish_id' => $this->parish->id,
            'password' => Hash::make('password123'),
            'is_active' => true,
            'face_reference_image' => 'cmVmZXJlbmNlX2ltYWdl',
        ]);

        $response = $this->post('/login/face', [
            'email' => $user->email,
            'captured_image' => 'data:image/jpeg;base64,Y2FwdHVyZWRfaW1hZ2U=',
        ]);

        $response->assertRedirect(route('dashboard'));
        $this->assertAuthenticatedAs($user);
    }

    public function test_face_login_redirects_parishioner_to_portal_dashboard(): void
    {
        Config::set('services.facepp.key', 'mock_valid_key');
        Config::set('services.facepp.secret', 'mock_valid_secret');

        Http::fake([
            'https://api-us.faceplusplus.com/facepp/v3/detect' => Http::response([
                'faces' => [
                    [
                        'face_token' => 'mock_token',
                        'attributes' => [
                            'facequality' => ['value' => 88.5, 'threshold' => 50.0],
                            'blur' => ['blurness' => ['value' => 12.0]],
                            'eyestatus' => [
                                'left_eye_status' => ['normal_glass_eye_open' => 99.0, 'normal_glass_eye_close' => 0.0, 'occlusion' => 0.0],
                                'right_eye_status' => ['normal_glass_eye_open' => 99.0, 'normal_glass_eye_close' => 0.0, 'occlusion' => 0.0],
                            ],
                            'headpose' => ['pitch_angle' => 2.0, 'yaw_angle' => -1.0, 'roll_angle' => 0.5],
                        ],
                    ],
                ],
            ], 200),
            'https://api-us.faceplusplus.com/facepp/v3/compare' => Http::response([
                'confidence' => 91.5,
                'thresholds' => [
                    '1e-5' => 75.3,
                ],
            ], 200),
        ]);

        $user = User::create([
            'username' => 'parishioner_test',
            'email' => 'parishioner@example.com',
            'display_name' => 'Parishioner Test',
            'role' => RoleEnum::PARISHIONER,
            'parish_id' => $this->parish->id,
            'password' => Hash::make('password123'),
            'is_active' => true,
            'face_reference_image' => 'cmVmZXJlbmNlX2ltYWdl',
        ]);

        $response = $this->post('/login/face', [
            'email' => $user->email,
            'captured_image' => 'Y2FwdHVyZWRfaW1hZ2U=',
        ]);

        $response->assertRedirect(route('portal.dashboard'));
        $this->assertAuthenticatedAs($user);
    }

    public function test_face_login_rejects_presentation_attack_spoofing_attempt(): void
    {
        Config::set('services.facepp.key', 'mock_valid_key');
        Config::set('services.facepp.secret', 'mock_valid_secret');

        // Emulate Face++ detecting low facequality from a photographed phone screen
        Http::fake([
            'https://api-us.faceplusplus.com/facepp/v3/detect' => Http::response([
                'faces' => [
                    [
                        'face_token' => 'mock_screen_token',
                        'attributes' => [
                            'facequality' => ['value' => 5.2, 'threshold' => 70.1], // Severe screen/print degradation
                            'blur' => ['blurness' => ['value' => 45.0]],
                        ],
                    ],
                ],
            ], 200),
        ]);

        $user = User::create([
            'username' => 'spoofed_user',
            'email' => 'spoofed@example.com',
            'display_name' => 'Spoofed User',
            'role' => RoleEnum::PARISHIONER,
            'parish_id' => $this->parish->id,
            'password' => Hash::make('password123'),
            'is_active' => true,
            'face_reference_image' => 'cmVmZXJlbmNlX2ltYWdl',
        ]);

        $response = $this->post('/login/face', [
            'email' => $user->email,
            'captured_image' => 'Y2FwdHVyZWRfc2NyZWVuX3Bob3Rv',
        ]);

        $response->assertSessionHasErrors(['captured_image']);
        $this->assertGuest();
    }

    public function test_user_can_enroll_face_reference_image(): void
    {
        $user = User::create([
            'username' => 'admin_test',
            'email' => 'admin@example.com',
            'display_name' => 'Admin Test',
            'role' => RoleEnum::ADMIN,
            'parish_id' => $this->parish->id,
            'password' => Hash::make('password123'),
            'is_active' => true,
            'face_reference_image' => null,
        ]);

        $response = $this->actingAs($user)->post('/user/face-reference', [
            'face_image' => 'data:image/png;base64,bXlfbmV3X3JlZmVyZW5jZV9pbWFnZQ==',
        ]);

        $response->assertSessionHas('success');
        $user->refresh();
        $this->assertEquals('bXlfbmV3X3JlZmVyZW5jZV9pbWFnZQ==', $user->face_reference_image);
    }

    public function test_parishioner_cannot_modify_enrolled_face_reference(): void
    {
        $user = User::create([
            'username' => 'parishioner_test',
            'email' => 'parishioner@example.com',
            'display_name' => 'Parishioner Test',
            'role' => RoleEnum::PARISHIONER,
            'parish_id' => $this->parish->id,
            'password' => Hash::make('password123'),
            'is_active' => true,
            'face_reference_image' => 'existing_canonical_face_image_base64',
        ]);

        $response = $this->actingAs($user)->post('/user/face-reference', [
            'face_image' => 'data:image/jpeg;base64,bmV3X2F0dGVtcHRlZF9mYWNl',
        ]);

        $response->assertStatus(403);
        $user->refresh();
        $this->assertEquals('existing_canonical_face_image_base64', $user->face_reference_image);
    }
}
