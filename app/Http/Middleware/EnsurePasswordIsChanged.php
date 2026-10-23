<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class EnsurePasswordIsChanged
{
    /**
     * Enforce immediate password change for accounts flagged with must_change_password.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = Auth::user();

        if ($user && $user->must_change_password) {
            $allowedRoutes = ['password.change', 'password.change.update', 'logout'];
            $currentRoute = $request->route()?->getName();

            if (!in_array($currentRoute, $allowedRoutes, true)) {
                return redirect()->route('password.change')->with(
                    'warning',
                    'For Archdiocesan security compliance, you must set a new personal password before accessing the system.'
                );
            }
        }

        return $next($request);
    }
}
