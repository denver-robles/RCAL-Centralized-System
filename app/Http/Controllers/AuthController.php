<?php

namespace App\Http\Controllers;

use App\Enums\AuditActionEnum;
use App\Enums\RoleEnum;
use App\Models\Parish;
use App\Models\User;
use App\Services\AuditService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

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
    public function logout(Request $request): RedirectResponse
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

        return redirect()->route('login')->with('success', 'You have been signed out successfully.');
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
}
