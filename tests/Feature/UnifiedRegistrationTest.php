<?php

namespace Tests\Feature;

use App\Enums\AuditActionEnum;
use App\Models\Parish;
use App\Models\User;
use App\Models\Vicariate;
use App\Services\IdentityVerificationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
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

        $dummyImage = 'data:image/jpeg;base64,'.base64_encode(str_repeat('X', 800));

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

        $dummyImage = 'data:image/jpeg;base64,'.base64_encode(str_repeat('X', 800));

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

        $dummyImage = 'data:image/jpeg;base64,'.base64_encode(str_repeat('X', 800));

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

        $dummyId = 'data:image/jpeg;base64,'.base64_encode(str_repeat('I', 800));
        $dummySelfie = 'data:image/jpeg;base64,'.base64_encode(str_repeat('S', 800));

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

        $dummyId = 'data:image/jpeg;base64,'.base64_encode(str_repeat('I', 800));
        $dummySelfie = 'data:image/jpeg;base64,'.base64_encode(str_repeat('S', 800));

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

        $dummyId = 'data:image/jpeg;base64,'.base64_encode(str_repeat('I', 800));
        $dummySelfie = 'data:image/jpeg;base64,'.base64_encode(str_repeat('S', 800));

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

        $dummyId = 'data:image/jpeg;base64,'.base64_encode(str_repeat('I', 800));
        $dummySelfie = 'data:image/jpeg;base64,'.base64_encode(str_repeat('S', 800));

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

        $dummyId = 'data:image/jpeg;base64,'.base64_encode(str_repeat('I', 800));
        $dummySelfie = 'data:image/jpeg;base64,'.base64_encode(str_repeat('S', 800));

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

    public function test_step_2_verified_id_is_reused_on_step_4_registration_submission(): void
    {
        Config::set('services.facepp.key', 'mock_valid_key');
        Config::set('services.facepp.secret', 'mock_valid_secret');

        Http::fake([
            'https://api-us.faceplusplus.com/facepp/v3/detect' => Http::response([
                'faces' => [['face_token' => 'mock_token']],
            ], 200),
            'https://api-us.faceplusplus.com/facepp/v3/compare' => Http::response([
                'confidence' => 91.4,
                'thresholds' => ['1e-5' => 75.3],
            ], 200),
            'https://api.ocr.space/parse/image' => Http::response([], 500),
        ]);

        $dummyId = 'data:image/jpeg;base64,'.base64_encode(str_repeat('I', 800));
        $dummySelfie = 'data:image/jpeg;base64,'.base64_encode(str_repeat('S', 800));

        // Step 2 verifies ID using client-extracted OCR text and stores session fingerprint
        $verifyResponse = $this->postJson('/register/verify-id', [
            'id_image' => $dummyId,
            'id_type' => 'philsys_national_id',
            'first_name' => 'Elena',
            'middle_name' => 'Reyes',
            'last_name' => 'Bautista',
            'ocr_text' => 'REPUBLIC OF THE PHILIPPINES PSN 1234-5678-9012-3456 ELENA REYES BAUTISTA',
        ]);

        $verifyResponse->assertOk()
            ->assertJsonPath('success', true);
        $this->assertTrue(session()->has('verified_id_registration'));

        // Step 4 submits without ocr_text; matching session fingerprint must bypass redundant OCR call
        $registerResponse = $this->post('/register', [
            'first_name' => 'Elena',
            'middle_name' => 'Reyes',
            'last_name' => 'Bautista',
            'email' => 'elena.bautista@test.ph',
            'phone' => '09171112222',
            'home_parish_id' => $this->parish->id,
            'password' => 'SecurePass123!',
            'password_confirmation' => 'SecurePass123!',
            'id_type' => 'philsys_national_id',
            'id_image' => $dummyId,
            'live_selfie' => $dummySelfie,
            'privacy_consent' => true,
        ]);

        $registerResponse->assertRedirect(route('portal.dashboard'));
        $this->assertAuthenticated();
        $this->assertFalse(session()->has('verified_id_registration'));

        // Step 2 invokes Face++ /detect once; Step 4 skips ID/OCR re-check and only invokes selfie liveness + /compare
        Http::assertSentCount(3);
        Http::assertNotSent(fn ($request): bool => str_contains($request->url(), 'api.ocr.space'));
    }

    public function test_step_4_revalidates_and_rejects_when_applicant_name_changes_after_step_2(): void
    {
        Config::set('services.facepp.key', 'mock_valid_key');
        Config::set('services.facepp.secret', 'mock_valid_secret');

        Http::fake([
            'https://api-us.faceplusplus.com/facepp/v3/detect' => Http::response([
                'faces' => [['face_token' => 'mock_token']],
            ], 200),
            'https://api.ocr.space/parse/image' => Http::response([], 500),
        ]);

        $dummyId = 'data:image/jpeg;base64,'.base64_encode(str_repeat('I', 800));
        $dummySelfie = 'data:image/jpeg;base64,'.base64_encode(str_repeat('S', 800));

        $this->postJson('/register/verify-id', [
            'id_image' => $dummyId,
            'id_type' => 'philsys_national_id',
            'first_name' => 'Elena',
            'last_name' => 'Bautista',
            'ocr_text' => 'REPUBLIC OF THE PHILIPPINES ELENA BAUTISTA ID-123456',
        ])->assertOk();

        // Alter last_name in Step 4 while keeping mismatched OCR text: cached fingerprint must NOT match
        $response = $this->post('/register', [
            'first_name' => 'Elena',
            'last_name' => 'Mendoza',
            'email' => 'tampered@test.ph',
            'phone' => '09171112222',
            'home_parish_id' => $this->parish->id,
            'password' => 'SecurePass123!',
            'password_confirmation' => 'SecurePass123!',
            'id_type' => 'philsys_national_id',
            'id_image' => $dummyId,
            'ocr_text' => 'REPUBLIC OF THE PHILIPPINES ELENA BAUTISTA ID-123456',
            'live_selfie' => $dummySelfie,
            'privacy_consent' => true,
        ]);

        $response->assertSessionHasErrors(['id_image']);
        $this->assertGuest();
    }

    public function test_step_4_accepts_client_ocr_text_directly_without_step_2_session(): void
    {
        Config::set('services.facepp.key', null);
        Config::set('services.facepp.secret', null);

        Http::fake([
            'https://api.ocr.space/parse/image' => Http::response([], 500),
        ]);

        $dummyId = 'data:image/jpeg;base64,'.base64_encode(str_repeat('I', 800));
        $dummySelfie = 'data:image/jpeg;base64,'.base64_encode(str_repeat('S', 800));

        $response = $this->post('/register', [
            'first_name' => 'Mateo',
            'last_name' => 'Villanueva',
            'email' => 'mateo.villanueva@test.ph',
            'phone' => '09173334444',
            'home_parish_id' => $this->parish->id,
            'password' => 'SecurePass123!',
            'password_confirmation' => 'SecurePass123!',
            'id_type' => 'umid',
            'id_image' => $dummyId,
            'ocr_text' => 'REPUBLIC OF THE PHILIPPINES CRN 0111-2222333-4 MATEO VILLANUEVA',
            'live_selfie' => $dummySelfie,
            'privacy_consent' => true,
        ]);

        $response->assertRedirect(route('portal.dashboard'));
        $this->assertAuthenticated();
        Http::assertNothingSent();
    }

    public function test_server_ocr_detects_png_mime_and_falls_back_from_engine_2_to_engine_1(): void
    {
        Config::set('services.facepp.key', null);
        Config::set('services.facepp.secret', null);
        Config::set('services.ocr.key', 'test_ocr_key');
        Config::set('services.ocr.verify_ssl', false);

        Http::fake([
            'https://api.ocr.space/parse/image' => Http::sequence()
                ->push(['ParsedResults' => [['ParsedText' => '']]], 200)
                ->push(['ParsedResults' => [['ParsedText' => "REPUBLIC OF THE PHILIPPINES\nMARIA CLARA REYES\nDL N01-23-456789"]]], 200),
        ]);

        // Valid 1x1 PNG payload padded past minimum base64 length threshold
        $pngBinary = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=').str_repeat("\x00", 600);
        $pngDataUrl = 'data:image/png;base64,'.base64_encode($pngBinary);

        $result = IdentityVerificationService::verifyAndExtractId(
            $pngDataUrl,
            'drivers_license',
            'Maria',
            'Clara',
            'Reyes',
            null
        );

        $this->assertTrue($result['success']);
        $this->assertTrue($result['name_match']);

        Http::assertSentCount(2);
        Http::assertSent(function ($request): bool {
            if (! str_contains($request->url(), 'api.ocr.space/parse/image') || ! $request->isMultipart()) {
                return false;
            }

            $parts = collect($request->data());
            $hasPngFile = $parts->contains(fn (array $part): bool => ($part['name'] ?? '') === 'file'
                && ($part['filename'] ?? '') === 'document.png');
            $hasEngine = $parts->contains(fn (array $part): bool => ($part['name'] ?? '') === 'OCREngine'
                && in_array($part['contents'] ?? '', ['1', '2'], true));

            return $hasPngFile && $hasEngine;
        });
    }
}
