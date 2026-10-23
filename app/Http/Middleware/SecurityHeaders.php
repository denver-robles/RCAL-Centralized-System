<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SecurityHeaders
{
    /**
     * Set robust HTTP security headers including Content-Security-Policy.
     */
    public function handle(Request $request, Closure $next): Response
    {
        /** @var Response $response */
        $response = $next($request);

        $isDev = app()->environment('local', 'testing') || config('app.debug');

        $viteHosts = $isDev ? ' http://localhost:5173 http://[::1]:5173 http://127.0.0.1:5173' : '';
        $viteWs = $isDev ? ' ws://localhost:5173 ws://[::1]:5173 ws://127.0.0.1:5173 http://localhost:8080' : '';

        $headers = [
            'X-Content-Type-Options' => 'nosniff',
            'X-Frame-Options' => 'SAMEORIGIN',
            'X-XSS-Protection' => '1; mode=block',
            'Referrer-Policy' => 'strict-origin-when-cross-origin',
            'Permissions-Policy' => 'camera=(self), microphone=(), geolocation=()',
            'Content-Security-Policy' => "default-src 'self'; "
                . "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://js.stripe.com{$viteHosts}; "
                . "style-src 'self' 'unsafe-inline' https://fonts.bunny.net https://fonts.googleapis.com{$viteHosts}; "
                . "font-src 'self' https://fonts.bunny.net https://fonts.gstatic.com data:; "
                . "img-src 'self' data: blob: https:{$viteHosts}; "
                . "connect-src 'self' https://api-us.faceplusplus.com https://cdn.jsdelivr.net https://tessdata.projectnaptha.com https://api.ocr.space https://api.stripe.com{$viteHosts}{$viteWs}; "
                . "worker-src 'self' blob:; "
                . "frame-src 'self' https://js.stripe.com; "
                . "object-src 'none'; "
                . "base-uri 'self';",
        ];

        foreach ($headers as $key => $value) {
            $response->headers->set($key, $value);
        }

        return $response;
    }
}
