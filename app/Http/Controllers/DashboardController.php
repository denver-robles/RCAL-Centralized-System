<?php

namespace App\Http\Controllers;

use App\Services\ParishScopingService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        
        $stats = ParishScopingService::combinedRequestStats($user);
        $sacramentCounts = ParishScopingService::sacramentCounts($user);
        
        return Inertia::render('Staff/Dashboard', [
            'stats' => $stats,
            'sacramentCounts' => $sacramentCounts,
        ]);
    }
}
