<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureParishionerIsolation
{
    /**
     * Internal path prefixes strictly forbidden to parishioner accounts (FR-1.3).
     */
    protected array $internalPrefixes = [
        'records',
        'certificates',
        'audit',
        'admin',
        'directory',
        'analytics',
    ];

    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && $user->isParishioner()) {
            foreach ($this->internalPrefixes as $prefix) {
                if ($request->is($prefix) || $request->is("{$prefix}/*")) {
                    abort(403, 'Access denied. Parishioners cannot access internal diocesan registers.');
                }
            }
        }

        return $next($request);
    }
}
