<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class PreventBackHistory
{
    /**
     * Handle an incoming request and set strict anti-caching headers for sensitive portal pages.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        // Enforce anti-caching headers if user is authenticated or visiting canonical portal/login routes
        if ($request->user() || $request->is('login*', 'portal*', 'records*', 'certificates*', 'schedules*', 'audit*', 'analytics*', 'users*', 'clergy*', 'dashboard*')) {
            $response->headers->set('Cache-Control', 'no-cache, no-store, max-age=0, must-revalidate');
            $response->headers->set('Pragma', 'no-cache');
            $response->headers->set('Expires', 'Sun, 02 Jan 1990 00:00:00 GMT');
        }

        return $response;
    }
}
