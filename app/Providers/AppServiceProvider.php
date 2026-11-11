<?php

namespace App\Providers;

use App\Models\CertificateTemplate;
use App\Policies\CertificateTemplatePolicy;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

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
    }
}
