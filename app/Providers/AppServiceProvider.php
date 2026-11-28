<?php

namespace App\Providers;

use App\Models\CertificateTemplate;
use App\Policies\CertificateTemplatePolicy;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;
use App\Mail\Transport\GmailApiTransport;
use Illuminate\Support\Facades\Mail;
class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Gate::policy(CertificateTemplate::class, CertificateTemplatePolicy::class);

        if ($this->app->environment('production')) {
            \URL::forceScheme('https');
        }
                Mail::extend('gmail-api', function () {
            return new GmailApiTransport(
                (string) config('services.gmail.client_id'),
                (string) config('services.gmail.client_secret'),
                (string) config('services.gmail.refresh_token'),
            );
        });
    }
}
