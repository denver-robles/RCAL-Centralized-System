<?php

namespace App\Http\Controllers;

use App\Enums\AuditActionEnum;
use App\Enums\RoleEnum;
use App\Models\Parish;
use App\Models\User;
use App\Services\AuditService;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
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
     * Handle parishioner registration request.
     */
    public function register(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'first_name' => ['required', 'string', 'max:60'],
            'middle_name' => ['nullable', 'string', 'max:60'],
            'last_name' => ['required', 'string', 'max:60'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'phone' => ['required', 'string', 'max:30'],
            'home_parish_id' => ['required', 'integer', 'exists:parishes,id'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
            'privacy_consent' => ['accepted'],
        ]);

        $firstName = trim($validated['first_name']);
        $middleName = !empty($validated['middle_name']) ? trim($validated['middle_name']) : null;
        $lastName = trim($validated['last_name']);

        $displayName = trim("{$firstName} " . ($middleName ? "{$middleName} " : '') . "{$lastName}");

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

        $user = User::create([
            'username' => $username,
            'email' => strtolower(trim($validated['email'])),
            'display_name' => $displayName,
            'role' => RoleEnum::PARISHIONER,
            'password' => Hash::make($validated['password']),
            'home_parish_id' => $validated['home_parish_id'],
            'phone' => trim($validated['phone']),
            'is_active' => true,
        ]);

        AuditService::log(
            $request,
            AuditActionEnum::CREATE,
            'user',
            $user->id,
            "New parishioner registered: {$user->email} ({$user->display_name})",
            $user
        );

        return redirect()->route('login')->with(
            'success',
            'Your parishioner account has been successfully created. You may now sign in.'
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
