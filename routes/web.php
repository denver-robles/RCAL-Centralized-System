<?php

use App\Http\Controllers\AnalyticsController;
use App\Http\Controllers\AuditController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\CertificatesController;
use App\Http\Controllers\ClergyController;
use App\Http\Controllers\PortalController;
use App\Http\Controllers\PublicController;
use App\Http\Controllers\RecordsController;
use App\Http\Controllers\SchedulesController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\DashboardController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Public Routes
|--------------------------------------------------------------------------
*/
Route::get('/', [PublicController::class, 'index'])->name('public.home');
Route::get('/track', [PublicController::class, 'track'])->name('public.track');
Route::get('/verify/{token}', [PublicController::class, 'verifyCertificate'])->name('public.verify');

Route::middleware('guest')->group(function () {
    Route::get('/login', [AuthController::class, 'showLogin'])->name('login');
    Route::post('/login', [AuthController::class, 'login'])->name('login.post');
    Route::get('/register', [AuthController::class, 'showRegister'])->name('register');
    Route::post('/register', [AuthController::class, 'register'])->name('register.post');
});

Route::post('/logout', [AuthController::class, 'logout'])->name('logout')->middleware('auth');

/*
|--------------------------------------------------------------------------
| Parishioner Self-Service Portal Routes (auth required)
|--------------------------------------------------------------------------
*/
Route::middleware(['auth'])->prefix('portal')->name('portal.')->group(function () {
    Route::get('/dashboard', [PortalController::class, 'dashboard'])->name('dashboard');
    Route::get('/requests/create', [PortalController::class, 'createRequest'])->name('requests.create');
    Route::post('/requests', [PortalController::class, 'storeRequest'])->name('requests.store');
    
    // Sacrament Schedule Requests
    Route::get('/schedule-requests/create', [PortalController::class, 'createScheduleRequest'])->name('schedule-requests.create');
    Route::post('/schedule-requests', [PortalController::class, 'storeScheduleRequest'])->name('schedule-requests.store');
    
    // Sacrament Schedule Payment
    Route::get('/schedule-requests/{schedule}/payment', [PortalController::class, 'paymentForm'])->name('schedule-requests.payment');
    Route::post('/schedule-requests/{schedule}/payment', [PortalController::class, 'submitPayment'])->name('schedule-requests.payment.submit');
});

/*
|--------------------------------------------------------------------------
| Diocesan Staff & Chancery Internal Modules (auth + staff middleware)
| Strictly isolated from parishioners via EnsureParishionerIsolation
|--------------------------------------------------------------------------
*/
Route::middleware(['auth', 'staff'])->group(function () {
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');

    // Canonical Registers (Can. 535)
    Route::get('/records', [RecordsController::class, 'index'])->name('records.index');
    Route::get('/records/create', [RecordsController::class, 'create'])->name('records.create');
    Route::post('/records', [RecordsController::class, 'store'])->name('records.store');
    Route::get('/records/{record}', [RecordsController::class, 'show'])->name('records.show');
    Route::post('/records/{record}/annotate', [RecordsController::class, 'annotate'])->name('records.annotate');
    Route::post('/records/{record}/void', [RecordsController::class, 'voidRecord'])->name('records.void');

    // Certificate Processing & Issuance
    Route::get('/certificates', [CertificatesController::class, 'index'])->name('certificates.index');
    Route::post('/certificates', [CertificatesController::class, 'store'])->name('certificates.store');
    Route::post('/certificates/match-claim', [CertificatesController::class, 'matchClaim'])->name('certificates.match-claim');
    Route::get('/certificates/{certificate}', [CertificatesController::class, 'show'])->name('certificates.show');
    Route::post('/certificates/{certificate}/transition', [CertificatesController::class, 'transition'])->name('certificates.transition');
    Route::get('/certificates/{certificate}/print', [CertificatesController::class, 'printCertificate'])->name('certificates.print');

    // Sacrament Schedules (Zero Mass Intentions)
    Route::get('/schedules', [SchedulesController::class, 'index'])->name('schedules.index');
    Route::get('/schedules/create', [SchedulesController::class, 'create'])->name('schedules.create');
    Route::get('/schedules/settings', [SchedulesController::class, 'settings'])->name('schedules.settings');
    Route::post('/schedules/settings', [SchedulesController::class, 'storeSettings'])->name('schedules.settings.store');
    Route::get('/schedules/check-conflict', [SchedulesController::class, 'checkConflict'])->name('schedules.check-conflict');
    Route::post('/schedules', [SchedulesController::class, 'store'])->name('schedules.store');
    Route::post('/schedules/{schedule}/status', [SchedulesController::class, 'updateStatus'])->name('schedules.status');

    // Directories: Clergy & Account Directory
    Route::get('/clergy', [ClergyController::class, 'index'])->name('clergy.index');
    Route::post('/clergy', [ClergyController::class, 'store'])->name('clergy.store');
    Route::get('/users', [UserController::class, 'index'])->name('users.index');
    Route::delete('/users/{user}', [UserController::class, 'destroy'])->name('users.destroy');

    // Chancery Curia Audit & Analytics
    Route::get('/audit', [AuditController::class, 'index'])->name('audit.index');
    Route::post('/audit/prune', [AuditController::class, 'prune'])->name('audit.prune');
    Route::get('/analytics', [AnalyticsController::class, 'index'])->name('analytics.index');
});
