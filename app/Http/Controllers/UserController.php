<?php

namespace App\Http\Controllers;

use App\Enums\AuditActionEnum;
use App\Models\User;
use App\Services\AuditService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class UserController extends Controller
{
    /**
     * Display the Account Directory.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();

        // Account management is reserved for chancery and parish administrators
        if (!$user->isStaff()) {
            abort(403, 'Unauthorized access to account directory.');
        }

        $search = trim((string) $request->query('search', ''));
        $role = $request->query('role', 'all');

        $query = User::query()->with('homeParish');

        if (!$user->isArchdioceseWide()) {
            $query->where('home_parish_id', $user->home_parish_id);
        }

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('username', 'like', "%{$search}%")
                  ->orWhere('display_name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        if ($role !== 'all') {
            $query->where('role', $role);
        }

        $users = $query->orderByDesc('id')->paginate(20)->withQueryString();

        return Inertia::render('Users/Index', [
            'users' => $users,
            'filters' => [
                'search' => $search,
                'role' => $role,
            ],
            'currentUserId' => $user->id,
        ]);
    }

    /**
     * Delete / Deactivate a user account with audit trail and self-deletion guard.
     */
    public function destroy(Request $request, User $user): RedirectResponse
    {
        $actor = $request->user();

        if ($user->id === $actor->id) {
            return redirect()->back()->with('error', 'You cannot delete your own active administrator account.');
        }

        if (!$actor->isArchdioceseWide() && (int) $user->home_parish_id !== (int) $actor->home_parish_id) {
            abort(403, 'Unauthorized to delete accounts belonging to other parish jurisdictions.');
        }

        $deletedUsername = $user->username;
        $deletedRole = $user->role?->value ?? 'unknown';

        // Soft delete user to retain referential integrity with canonical annotations & audit trails
        $user->delete();

        AuditService::log(
            $request,
            AuditActionEnum::DELETE,
            'user',
            $user->id,
            "Account {$deletedUsername} ({$deletedRole}) soft-deleted by {$actor->username}"
        );

        return redirect()->route('users.index')
            ->with('success', "Account '{$deletedUsername}' has been successfully deleted.");
    }
}
