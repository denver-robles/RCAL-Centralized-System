<?php

namespace App\Console\Commands;

use App\Models\AuditLog;
use Illuminate\Console\Command;

class PruneAuditLogs extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'audit:prune-retention {--days=365 : Number of days retention cutoff}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Prune audit log entries older than 365 days (1-year canonical accountability trail)';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $days = (int) $this->option('days') ?: 365;
        $cutoff = now()->subDays($days);

        $count = AuditLog::where('created_at', '<', $cutoff)->delete();

        $this->info("Audit log retention policy executed: {$count} records older than {$days} days ({$cutoff->toDateTimeString()}) have been purged.");

        return self::SUCCESS;
    }
}
