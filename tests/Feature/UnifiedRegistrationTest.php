<?php

namespace Tests\Feature;

use App\Enums\AuditActionEnum;
use App\Enums\RoleEnum;
use App\Models\Parish;
use App\Models\User;
use App\Models\Vicariate;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class UnifiedRegistrationTest extends TestCase
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

    public function test_verify_id_document_extracts_details_and_detects_face(): void
    {
        Http::fake([
            'https://api-us.faceplusplus.com/facepp/v3/detect' => Http::response([
                'faces' => [['face_token' => 'mock_face_token']],
            ], 200),
        ]);

        $dummyImage = 'data:image/jpeg;base64,' . base64_encode(str_repeat('X', 800));

        $response = $this->postJson('/register/verify-id', [
            'id_image' => $dummyImage,
            'id_type' => 'philsys_national_id',
            'first_name' => 'Juan',
            'middle_name' => 'Protacio',
            'last_name' => 'Rizal',
        ]);

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
            'id_type' => 'philsys_national_id',
            'extracted_name' => 'Juan Protacio Rizal',
            'name_match' => true,
            'face_detected' => true,
        ]);
        $this->assertNotEmpty($response->json('id_number_masked'));
    }

    public function test_verify_id_document_fails_when_image_is_too_small_or_invalid(): void
    {
        $response = $this->postJson('/register/verify-id', [
            'id_image' => 'data:image/jpeg;base64,invalid',
            'id_type' => 'philsys_national_id',
            'first_name' => 'Juan',
            'last_name' => 'Rizal',
        ]);

        $response->assertStatus(422);
        $response->assertJson([
            'success' => false,
        ]);
    }

    public function test_verify_id_document_fails_when_ocr_name_does_not_match_registrant(): void
    {
        Http::fake([
            'https://api-us.faceplusplus.com/facepp/v3/detect' => Http::response([
                'faces' => [['face_token' => 'mock_face_token']],
            ], 200),
        ]);

        $dummyImage = 'data:image/jpeg;base64,' . base64_encode(str_repeat('X', 800));

        // Attempting to register Karl Petallo using an ID belonging to Pamplona
        $response = $this->postJson('/register/verify-id', [
            'id_image' => $dummyImage,
            'id_type' => 'drivers_license',
            'first_name' => 'Karl Daniel',
            'middle_name' => 'Plandes',
            'last_name' => 'Petallo',
            'ocr_text' => "REPUBLIC OF THE PHILIPPINES\nDEPARTMENT OF TRANSPORTATION\nDRIVER'S LICENSE\nLast Name. First Name. Middle Name\nPAMPLONA, MIKOS BRYLE CUENCA\nD14-22-301521",
        ]);

        $response->assertStatus(422);
        $response->assertJson([
            'success' => false,
        ]);
        $this->assertStringContainsString('mismatch', strtolower($response->json('error')));
        $this->assertStringContainsString('PAMPLONA', $response->json('error'));
    }

    public function test_verify_id_document_succeeds_when_ocr_matches_applicant(): void
    {
        Http::fake([
            'https://api-us.faceplusplus.com/facepp/v3/detect' => Http::response([
                'faces' => [['face_token' => 'mock_face_token']],
            ], 200),
        ]);

        $dummyImage = 'data:image/jpeg;base64,' . base64_encode(str_repeat('X', 800));

        $response = $this->postJson('/register/verify-id', [
            'id_image' => $dummyImage,
            'id_type' => 'drivers_license',
            'first_name' => 'Mikos Bryle',
            'middle_name' => 'Cuenca',
            'last_name' => 'Pamplona',
            'ocr_text' => "REPUBLIC OF THE PHILIPPINES\nDRIVER'S LICENSE\nLast Name. First Name. Middle Name\nPAMPLONA, MIKOS BRYLE CUENCA\nD14-22-301521",
        ]);

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
            'name_match' => true,
            'extracted_name' => 'Mikos Bryle Cuenca Pamplona',
        ]);
        $this->assertStringContainsString('D14', $response->json('id_number_masked'));
    }

    public function test_verify_face_biometrics_succeeds_when_confidence_meets_threshold(): void
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
                'confidence' => 95.4,
                'thresholds' => [
                    '1e-5' => 75.3,
                ],
            ], 200),
        ]);

        $dummyId = 'data:image/jpeg;base64,' . base64_encode(str_repeat('I', 800));
        $dummySelfie = 'data:image/jpeg;base64,' . base64_encode(str_repeat('S', 800));

        $response = $this->postJson('/register/verify-face', [
            'id_image' => $dummyId,
            'live_selfie' => $dummySelfie,
        ]);

        $response->assertStatus(200);
        $response->assertJson([
            'matched' => true,
            'confidence' => 95.4,
        ]);
    }

    public function test_verify_face_biometrics_fails_when_confidence_is_below_threshold(): void
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
                'confidence' => 42.1,
                'thresholds' => [
                    '1e-5' => 75.3,
                ],
            ], 200),
        ]);

        $dummyId = 'data:image/jpeg;base64,' . base64_encode(str_repeat('I', 800));
        $dummySelfie = 'data:image/jpeg;base64,' . base64_encode(str_repeat('S', 800));

        $response = $this->postJson('/register/verify-face', [
            'id_image' => $dummyId,
            'live_selfie' => $dummySelfie,
        ]);

        $response->assertStatus(422);
        $response->assertJson([
            'matched' => false,
            'confidence' => 42.1,
        ]);
    }

    public function test_verify_face_biometrics_rejects_screen_presentation_attack(): void
    {
        Config::set('services.facepp.key', 'mock_valid_key');
        Config::set('services.facepp.secret', 'mock_valid_secret');

        // Phone screen photographed or static printout detected
        Http::fake([
            'https://api-us.faceplusplus.com/facepp/v3/detect' => Http::response([
                'faces' => [
                    [
                        'face_token' => 'mock_screen_token',
                        'attributes' => [
                            'facequality' => ['value' => 4.8, 'threshold' => 70.1],
                            'blur' => ['blurness' => ['value' => 65.0]],
                        ],
                    ],
                ],
            ], 200),
        ]);

        $dummyId = 'data:image/jpeg;base64,' . base64_encode(str_repeat('I', 800));
        $dummySelfie = 'data:image/jpeg;base64,' . base64_encode(str_repeat('S', 800));

        $response = $this->postJson('/register/verify-face', [
            'id_image' => $dummyId,
            'live_selfie' => $dummySelfie,
        ]);

        $response->assertStatus(422);
        $response->assertJson([
            'matched' => false,
        ]);
        $this->assertStringContainsString('presentation attack', strtolower($response->json('error')));
    }

    public function test_full_registration_creates_verified_parishioner_with_face_reference(): void
    {
        Config::set('services.facepp.key', 'mock_valid_key');
        Config::set('services.facepp.secret', 'mock_valid_secret');

        Http::fake([
            'https://api-us.faceplusplus.com/facepp/v3/detect' => Http::response([
                'faces' => [['face_token' => 'mock_face_token_1']],
            ], 200),
            'https://api-us.faceplusplus.com/facepp/v3/compare' => Http::response([
                'confidence' => 94.8,
                'thresholds' => [
                    '1e-5' => 75.3,
                ],
            ], 200),
        ]);

        $dummyId = 'data:image/jpeg;base64,' . base64_encode(str_repeat('I', 800));
        $dummySelfie = 'data:image/jpeg;base64,' . base64_encode(str_repeat('S', 800));

        $response = $this->post('/register', [
            'first_name' => 'Clara',
            'middle_name' => 'Molina',
            'last_name' => 'Santos',
            'name_suffix' => 'Jr.',
            'date_of_birth' => '1998-05-15',
            'email' => 'clara.santos@test.ph',
            'phone' => '09179876543',
            'home_parish_id' => $this->parish->id,
            'password' => 'SecurePass123!',
            'password_confirmation' => 'SecurePass123!',
            'id_type' => 'drivers_license',
            'id_image' => $dummyId,
            'live_selfie' => $dummySelfie,
            'privacy_consent' => true,
        ]);

        $response->assertRedirect(route('portal.dashboard'));
        $this->assertAuthenticated();

        $user = User::where('email', 'clara.santos@test.ph')->first();
        $this->assertNotNull($user);
        $this->assertEquals('Clara', $user->first_name);
        $this->assertEquals('Santos', $user->last_name);
        $this->assertEquals('verified', $user->identity_status);
        $this->assertNotNull($user->id_verified_at);
        $this->assertEquals('drivers_license', $user->extracted_id_type);
        $this->assertNotNull($user->id_number_masked);
        $this->assertNotNull($user->face_reference_image);

        // Verify audit log
        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $user->id,
            'action' => AuditActionEnum::CREATE->value,
        ]);
    }

    public function test_registration_fails_when_face_biometrics_do_not_match(): void
    {
        Config::set('services.facepp.key', 'mock_valid_key');
        Config::set('services.facepp.secret', 'mock_valid_secret');

        Http::fake([
            'https://api-us.faceplusplus.com/facepp/v3/detect' => Http::response([
                'faces' => [['face_token' => 'mock_token']],
            ], 200),
            'https://api-us.faceplusplus.com/facepp/v3/compare' => Http::response([
                'confidence' => 35.0,
                'thresholds' => [
                    '1e-5' => 75.3,
                ],
            ], 200),
        ]);

        $dummyId = 'data:image/jpeg;base64,' . base64_encode(str_repeat('I', 800));
        $dummySelfie = 'data:image/jpeg;base64,' . base64_encode(str_repeat('S', 800));

        $response = $this->post('/register', [
            'first_name' => 'Clara',
            'last_name' => 'Santos',
            'email' => 'mismatch@test.ph',
            'phone' => '09179876543',
            'home_parish_id' => $this->parish->id,
            'password' => 'SecurePass123!',
            'password_confirmation' => 'SecurePass123!',
            'id_type' => 'drivers_license',
            'id_image' => $dummyId,
            'live_selfie' => $dummySelfie,
            'privacy_consent' => true,
        ]);

        $response->assertSessionHasErrors(['live_selfie']);
        $this->assertGuest();
    }
}
