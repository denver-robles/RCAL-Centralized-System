<?php

namespace Tests\Feature;

use App\Enums\RoleEnum;
use App\Models\Parish;
use App\Models\User;
use App\Models\Vicariate;
use App\Services\CarboneCertificateService;
use Illuminate\Support\Facades\Hash;
use Inertia\Testing\AssertableInertia as Assert;
use Mockery;
use Tests\TestCase;

class CertificateTemplatePreviewTest extends TestCase
{
    protected Parish $parish;

    protected User $staff;

    protected function setUp(): void
    {
        parent::setUp();

        $vicariate = Vicariate::create(['name' => 'Central Vicariate']);
        $this->parish = Parish::create(['name' => 'St. Sebastian Cathedral', 'vicariate_id' => $vicariate->id, 'is_active' => true]);

        $this->staff = User::create([
            'username' => 'staff_preview_test',
            'email' => 'preview_test@rcal.ph',
            'role' => RoleEnum::PARISH_STAFF,
            'home_parish_id' => $this->parish->id,
            'password' => Hash::make('password'),
            'is_active' => true,
        ]);
    }

    public function test_staff_can_view_certificate_preview_page(): void
    {
        $response = $this->actingAs($this->staff)->get('/certificate-templates/preview');

        $response->assertStatus(200);
        $response->assertInertia(fn (Assert $page) => $page
            ->component('CertificateTemplates/Preview')
            ->has('selectedSacrament')
            ->has('populatedData')
            ->where('selectedSacrament', 'baptism')
        );
    }

    public function test_preview_pdf_streams_pdf_on_success(): void
    {
        $mockCarbone = Mockery::mock(CarboneCertificateService::class);
        $mockCarbone->shouldReceive('renderDeployed')
            ->once()
            ->with(Mockery::type('string'), Mockery::type('array'), 'pdf')
            ->andReturn("%PDF-1.4\n%Fake PDF content for test");

        $this->app->instance(CarboneCertificateService::class, $mockCarbone);

        $response = $this->actingAs($this->staff)
            ->post('/certificate-templates/preview-pdf', [
                'sacrament_type' => 'baptism',
                'overrides' => [
                    'recipient_name' => 'TEST CANDIDATE',
                ],
            ]);

        $response->assertStatus(200);
        $response->assertHeader('Content-Type', 'application/pdf');
    }

    public function test_preview_pdf_returns_json_error_on_carbone_failure(): void
    {
        $mockCarbone = Mockery::mock(CarboneCertificateService::class);
        $mockCarbone->shouldReceive('renderDeployed')
            ->once()
            ->andThrow(new \RuntimeException('Carbone API unreachable'));

        $this->app->instance(CarboneCertificateService::class, $mockCarbone);

        $response = $this->actingAs($this->staff)
            ->postJson('/certificate-templates/preview-pdf', [
                'sacrament_type' => 'baptism',
            ]);

        $response->assertStatus(500);
        $response->assertJson([
            'error' => 'Carbone PDF generation failed: Carbone API unreachable',
        ]);
    }
}
