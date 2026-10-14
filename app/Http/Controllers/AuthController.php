<?php

namespace App\Http\Controllers;

use App\Enums\AuditActionEnum;
use App\Enums\RoleEnum;
use App\Models\Parish;
use App\Models\User;
use App\Services\AuditService;
use App\Services\IdentityVerificationService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;

class AuthController extends Controller
{
    /**
     * Show the split-canvas login view.
     */
    public function showLogin(): Response|RedirectResponse
    {
        if (Auth::check()) {
            $user = Auth::user();
            return $user->isParishioner()
                ? redirect()->route('portal.dashboard')
                : redirect()->route('dashboard');
        }

        return Inertia::render('Auth/Login');
    }

    /**
     * Handle authentication attempt for parishioners and diocesan staff.
     */
    public function login(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'identifier' => ['required', 'string'],
            'password' => ['required', 'string'],
            'remember' => ['sometimes', 'boolean'],
        ]);

        $identifier = trim($validated['identifier']);
        $password = $validated['password'];
        $remember = (bool) ($validated['remember'] ?? false);

        /** @var User|null $user */
        $user = User::query()
            ->where('username', $identifier)
            ->orWhere('email', $identifier)
            ->first();

        if (!$user || !Hash::check($password, $user->password)) {
            AuditService::log(
                $request,
                AuditActionEnum::LOGIN_FAILED,
                'user',
                $user?->id,
                "Failed authentication attempt for identifier: {$identifier}"
            );

            throw ValidationException::withMessages([
                'identifier' => ['The provided credentials do not match our canonical records.'],
            ]);
        }

        if (!$user->is_active) {
            AuditService::log(
                $request,
                AuditActionEnum::LOGIN_FAILED,
                'user',
                $user->id,
                "Authentication attempt rejected: Account is inactive ({$user->username})"
            );

            throw ValidationException::withMessages([
                'identifier' => ['This account is deactivated. Please contact the Archdiocesan Chancery.'],
            ]);
        }

        Auth::login($user, $remember);

        $user->update(['last_login_at' => now()]);

        $request->session()->regenerate();

        Inertia::clearHistory();

        AuditService::log(
            $request,
            AuditActionEnum::LOGIN,
            'user',
            $user->id,
            "User {$user->username} authenticated as {$user->role?->value}"
        );

        if ($user->isParishioner()) {
            return redirect()->intended(route('portal.dashboard'));
        }

        return redirect()->intended(route('dashboard'));
    }

    /**
     * Handle Face++ Biometric Facial Recognition Authentication.
     */
    public function faceLogin(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'string'],
            'captured_image' => ['required', 'string'],
        ]);

        $identifier = trim($validated['email']);

        /** @var User|null $user */
        $user = User::query()
            ->where('email', $identifier)
            ->orWhere('username', $identifier)
            ->first();

        if (!$user) {
            AuditService::log(
                $request,
                AuditActionEnum::LOGIN_FAILED,
                'user',
                null,
                "Face login failed: Account not found for identifier {$identifier}"
            );

            return back()->withErrors([
                'email' => 'The provided email or username does not match our records.',
                'captured_image' => 'The provided email or username does not match our records.',
            ]);
        }

        if (!$user->is_active) {
            AuditService::log(
                $request,
                AuditActionEnum::LOGIN_FAILED,
                'user',
                $user->id,
                "Face authentication rejected: Account is inactive ({$user->username})"
            );

            return back()->withErrors([
                'captured_image' => 'This account is deactivated. Please contact the Archdiocesan Chancery.',
            ]);
        }

        if (!$user->face_reference_image) {
            return back()->withErrors([
                'captured_image' => 'No enrolled biometric reference photo found for this account. Please sign in with password first.',
            ]);
        }

        $apiKey = config('services.facepp.key');
        $apiSecret = config('services.facepp.secret');

        if (empty($apiKey) || empty($apiSecret) || str_contains($apiKey, 'your_api_key')) {
            return back()->withErrors([
                'captured_image' => 'Face++ API credentials are not configured in your .env file.',
            ]);
        }

        // Clean base64 strings (strip data scheme prefix if present)
        $capturedImage = preg_replace('#^data:image/\w+;base64,#i', '', $validated['captured_image']);
        $referenceImage = preg_replace('#^data:image/\w+;base64,#i', '', $user->face_reference_image);

        // Server-Side Presentation Attack Detection (PAD): Reject screens, mobile phones, and printed photos
        $padCheck = \App\Services\IdentityVerificationService::verifyLivenessAndQuality($capturedImage);
        if (!$padCheck['passed']) {
            AuditService::log(
                $request,
                AuditActionEnum::LOGIN_FAILED,
                'user',
                $user->id,
                "Face authentication rejected for {$user->username}: {$padCheck['error']}"
            );

            return back()->withErrors([
                'captured_image' => $padCheck['error'],
            ]);
        }

        // Call Face++ Compare Endpoint
        try {
            $client = Http::asForm()->timeout(15);
            if (!config('services.facepp.verify_ssl', false)) {
                $client = $client->withoutVerifying();
            }

            $response = $client->post('https://api-us.faceplusplus.com/facepp/v3/compare', [
                'api_key' => $apiKey,
                'api_secret' => $apiSecret,
                'image_base64_1' => $capturedImage,
                'image_base64_2' => $referenceImage,
            ]);

            $result = $response->json();
        } catch (\Throwable $e) {
            return back()->withErrors([
                'captured_image' => 'Face recognition network error: ' . $e->getMessage(),
            ]);
        }

        // Handle Face++ API errors (e.g. no face detected in one of the images)
        if (isset($result['error_message'])) {
            return back()->withErrors([
                'captured_image' => 'Face++ API Error: ' . $result['error_message'],
            ]);
        }

        // Verify confidence against the 1e-5 threshold (0.001% false acceptance rate)
        $confidence = $result['confidence'] ?? 0;
        $threshold = $result['thresholds']['1e-5'] ?? ($result['thresholds']['1e-4'] ?? 80);

        if ($confidence >= $threshold) {
            Auth::login($user);
            $user->update(['last_login_at' => now()]);
            $request->session()->regenerate();
            Inertia::clearHistory();

            AuditService::log(
                $request,
                AuditActionEnum::LOGIN,
                'user',
                $user->id,
                "User {$user->username} authenticated via Face++ biometric match (Confidence: {$confidence}%, Threshold: {$threshold}%)"
            );

            if ($user->isParishioner()) {
                return redirect()->intended(route('portal.dashboard'));
            }

            return redirect()->intended(route('dashboard'));
        }

        AuditService::log(
            $request,
            AuditActionEnum::LOGIN_FAILED,
            'user',
            $user->id,
            "Face recognition match rejected for {$user->username}: confidence {$confidence}% is below threshold {$threshold}%"
        );

        return back()->withErrors([
            'captured_image' => "Face verification failed. Confidence ({$confidence}%) is below required threshold ({$threshold}%). Please try again with good lighting or sign in with password.",
        ]);
    }

    /**
     * Store or update user's face reference photo.
     */
    public function updateFaceReference(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'face_image' => ['required', 'string'],
        ]);

        $user = $request->user();

        // Biometric face biometrics of registered parishioners are canonical records and permanently sealed
        if ($user->isParishioner() && !empty($user->face_reference_image)) {
            abort(403, 'Biometric credentials for registered parishioners are canonical and permanently sealed. Contact the parish chancery for identity re-issuance.');
        }

        $cleanBase64 = preg_replace('#^data:image/\w+;base64,#i', '', $validated['face_image']);

        $user->update([
            'face_reference_image' => $cleanBase64,
        ]);

        AuditService::log(
            $request,
            AuditActionEnum::UPDATE,
            'user',
            $user->id,
            "Biometric face reference image enrolled for {$user->username}"
        );

        return back()->with('success', 'Biometric face reference photo successfully saved.');
    }

    /**
     * Log out the authenticated user.
     */
    public function logout(Request $request): SymfonyResponse|RedirectResponse
    {
        $user = $request->user();

        if ($user) {
            AuditService::log(
                $request,
                AuditActionEnum::LOGOUT,
                'user',
                $user->id,
                "User {$user->username} signed out"
            );
        }

        Auth::logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        Inertia::clearHistory();

        $redirect = $request->input('redirect', $request->query('redirect'));
        $targetUrl = ($redirect === '/' || $redirect === 'home') ? url('/') : route('login');

        if ($request->header('X-Inertia')) {
            return Inertia::location($targetUrl);
        }

        return redirect($targetUrl)->with('success', 'You have been signed out successfully.');
    }

    /**
     * Show the parishioner registration view.
     */
    public function showRegister(): Response|RedirectResponse
    {
        if (Auth::check()) {
            $user = Auth::user();
            return $user->isParishioner()
                ? redirect()->route('portal.dashboard')
                : redirect()->route('dashboard');
        }

        $parishes = Parish::query()
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name', 'municipality', 'city_municipality']);

        return Inertia::render('Auth/Register', [
            'parishes' => $parishes,
        ]);
    }

    /**
     * Inspect and verify the uploaded Government ID document in real-time.
     */
    public function verifyIdDocument(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'id_image' => ['required', 'string'],
            'id_type' => ['required', 'string', 'max:80'],
            'first_name' => ['required', 'string', 'max:60'],
            'middle_name' => ['nullable', 'string', 'max:60'],
            'last_name' => ['required', 'string', 'max:60'],
            'ocr_text' => ['nullable', 'string'],
        ]);

        $result = IdentityVerificationService::verifyAndExtractId(
            $validated['id_image'],
            $validated['id_type'],
            $validated['first_name'],
            $validated['middle_name'] ?? null,
            $validated['last_name'],
            $validated['ocr_text'] ?? null
        );

        if (!$result['success']) {
            return response()->json([
                'success' => false,
                'error' => $result['error'] ?? 'Government ID verification failed. Please ensure the document is clear.',
            ], 422);
        }

        return response()->json($result);
    }

    /**
     * Compare live webcam portrait with the photo on the government ID in real-time.
     */
    public function verifyFaceBiometrics(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'id_image' => ['required', 'string'],
            'live_selfie' => ['required', 'string'],
        ]);

        $result = IdentityVerificationService::compareIdWithLiveFace(
            $validated['id_image'],
            $validated['live_selfie']
        );

        if (isset($result['error']) || !$result['matched']) {
            return response()->json([
                'matched' => false,
                'confidence' => $result['confidence'] ?? 0,
                'threshold' => $result['threshold'] ?? 75.0,
                'error' => $result['error'] ?? ($result['message'] ?? 'Facial biometric comparison did not meet security threshold.'),
            ], 422);
        }

        return response()->json($result);
    }

    /**
     * Handle parishioner registration request with atomic ID & Face biometric verification.
     */
    public function register(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'first_name' => ['required', 'string', 'max:60'],
            'middle_name' => ['nullable', 'string', 'max:60'],
            'last_name' => ['required', 'string', 'max:60'],
            'name_suffix' => ['nullable', 'string', 'max:20'],
            'date_of_birth' => ['nullable', 'date'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'phone' => ['required', 'string', 'max:30'],
            'home_parish_id' => ['required', 'integer', 'exists:parishes,id'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
            'privacy_consent' => ['accepted'],
            'id_type' => ['required', 'string', 'max:80'],
            'id_image' => ['required', 'string'],
            'live_selfie' => ['required', 'string'],
        ]);

        // 1. Verify Government ID
        $idResult = IdentityVerificationService::verifyAndExtractId(
            $validated['id_image'],
            $validated['id_type'],
            $validated['first_name'],
            $validated['middle_name'] ?? null,
            $validated['last_name']
        );

        if (!$idResult['success']) {
            return back()->withErrors([
                'id_image' => $idResult['error'] ?? 'Government ID document could not be verified.',
            ])->withInput();
        }

        // 2. Compare Face Biometrics (ID photo vs live selfie)
        $faceResult = IdentityVerificationService::compareIdWithLiveFace(
            $validated['id_image'],
            $validated['live_selfie']
        );

        if (!$faceResult['matched']) {
            return back()->withErrors([
                'live_selfie' => $faceResult['error'] ?? ($faceResult['message'] ?? 'Facial biometric verification failed.'),
            ])->withInput();
        }

        $firstName = trim($validated['first_name']);
        $middleName = !empty($validated['middle_name']) ? trim($validated['middle_name']) : null;
        $lastName = trim($validated['last_name']);
        $suffix = !empty($validated['name_suffix']) ? trim($validated['name_suffix']) : null;

        $displayName = trim("{$firstName} " . ($middleName ? "{$middleName} " : '') . "{$lastName}" . ($suffix ? " {$suffix}" : ''));

        // Generate clean and unique username
        $baseUsername = Str::slug("{$firstName}.{$lastName}", '.');
        if (empty($baseUsername)) {
            $baseUsername = explode('@', $validated['email'])[0];
        }
        $baseUsername = substr($baseUsername, 0, 60);

        $username = $baseUsername;
        $counter = 1;
        while (User::where('username', $username)->exists()) {
            $username = $baseUsername . $counter;
            $counter++;
        }

        $cleanLiveSelfie = IdentityVerificationService::sanitizeBase64($validated['live_selfie']);

        $user = DB::transaction(function () use ($validated, $username, $displayName, $firstName, $middleName, $lastName, $suffix, $idResult, $cleanLiveSelfie) {
            return User::create([
                'username' => $username,
                'email' => strtolower(trim($validated['email'])),
                'display_name' => $displayName,
                'first_name' => $firstName,
                'middle_name' => $middleName,
                'last_name' => $lastName,
                'name_suffix' => $suffix,
                'date_of_birth' => $validated['date_of_birth'] ?? null,
                'role' => RoleEnum::PARISHIONER,
                'password' => Hash::make($validated['password']),
                'home_parish_id' => $validated['home_parish_id'],
                'phone' => trim($validated['phone']),
                'is_active' => true,
                'identity_status' => 'verified',
                'id_verified_at' => now(),
                'extracted_id_type' => $validated['id_type'],
                'id_number_masked' => $idResult['id_number_masked'] ?? null,
                'extracted_id_details' => $idResult,
                'face_reference_image' => $cleanLiveSelfie,
            ]);
        });

        AuditService::log(
            $request,
            AuditActionEnum::CREATE,
            'user',
            $user->id,
            "New parishioner registered with verified {$validated['id_type']} and Face++ biometric match: {$user->email} ({$user->display_name})",
            $user
        );

        Auth::login($user);
        $request->session()->regenerate();

        return redirect()->route('portal.dashboard')->with(
            'success',
            'Mabuhay! Your parishioner account has been created and your identity has been verified via Government ID and Face++ biometrics.'
        );
    }

    /**
     * Show the forgot password view.
     */
    public function showForgotPassword(): Response|RedirectResponse
    {
        if (Auth::check()) {
            $user = Auth::user();
            return $user->isParishioner()
                ? redirect()->route('portal.dashboard')
                : redirect()->route('dashboard');
        }

        return Inertia::render('Auth/ForgotPassword');
    }

    /**
     * Handle sending password reset token.
     */
    public function sendResetLink(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'string'],
        ]);

        $identifier = trim($validated['email']);

        /** @var User|null $user */
        $user = User::query()
            ->where('email', $identifier)
            ->orWhere('username', $identifier)
            ->first();

        if (!$user) {
            return back()->with('status', 'If that account exists in our diocesan records, a recovery link has been created.');
        }

        $token = Str::random(60);

        DB::table('password_reset_tokens')->updateOrInsert(
            ['email' => $user->email],
            [
                'token' => Hash::make($token),
                'created_at' => now(),
            ]
        );

        $resetUrl = route('password.reset', [
            'token' => $token,
            'email' => $user->email,
        ]);

        AuditService::log(
            $request,
            AuditActionEnum::UPDATE,
            'user',
            $user->id,
            "Password recovery token generated for {$user->username} ({$user->email})"
        );

        return back()
            ->with('status', 'A password recovery link has been generated. You may now reset your password directly.')
            ->with('reset_url', $resetUrl);
    }

    /**
     * Show the reset password view.
     */
    public function showResetPassword(Request $request, string $token): Response|RedirectResponse
    {
        if (Auth::check()) {
            $user = Auth::user();
            return $user->isParishioner()
                ? redirect()->route('portal.dashboard')
                : redirect()->route('dashboard');
        }

        return Inertia::render('Auth/ResetPassword', [
            'token' => $token,
            'email' => $request->query('email', ''),
        ]);
    }

    /**
     * Handle resetting password.
     */
    public function resetPassword(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'token' => ['required', 'string'],
            'email' => ['required', 'email'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $record = DB::table('password_reset_tokens')
            ->where('email', $validated['email'])
            ->first();

        if (!$record || !Hash::check($validated['token'], $record->token)) {
            throw ValidationException::withMessages([
                'email' => ['This password reset link is invalid or has expired.'],
            ]);
        }

        // Check if token is older than 60 minutes
        if (Carbon::parse($record->created_at)->addMinutes(60)->isPast()) {
            DB::table('password_reset_tokens')->where('email', $validated['email'])->delete();
            throw ValidationException::withMessages([
                'email' => ['This password reset token has expired. Please request a new link.'],
            ]);
        }

        /** @var User|null $user */
        $user = User::where('email', $validated['email'])->first();

        if (!$user) {
            throw ValidationException::withMessages([
                'email' => ['We could not find an account associated with this email address.'],
            ]);
        }

        $user->forceFill([
            'password' => Hash::make($validated['password']),
        ])->save();

        DB::table('password_reset_tokens')->where('email', $validated['email'])->delete();

        AuditService::log(
            $request,
            AuditActionEnum::UPDATE,
            'user',
            $user->id,
            "Password reset successfully completed for user {$user->username}"
        );

        return redirect()->route('login')->with(
            'success',
            'Your password has been successfully reset. You may now sign in with your new credentials.'
        );
    }
}
