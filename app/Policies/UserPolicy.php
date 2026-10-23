<?php

namespace App\Policies;

use App\Models\User;

class UserPolicy
{
    /**
     * Determine whether the user can view the account directory.
     */
    public function viewAny(User $user): bool
    {
        return $user->canManageUsers();
    }

    /**
     * Determine whether the user can view a specific user account.
     */
    public function view(User $user, User $model): bool
    {
        return $user->canManageUsers();
    }

    /**
     * Determine whether the user can create accounts.
     */
    public function create(User $user): bool
    {
        return $user->canManageUsers();
    }

    /**
     * Determine whether the user can update an account.
     */
    public function update(User $user, User $model): bool
    {
        return $user->canManageUsers();
    }

    /**
     * Determine whether the user can delete/deactivate an account.
     * Prevents self-deletion.
     */
    public function delete(User $user, User $model): bool
    {
        return $user->canManageUsers() && (int) $user->id !== (int) $model->id;
    }
}
