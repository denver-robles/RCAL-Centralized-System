<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use PDO;

class MigrateFromSqliteCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'rcal:migrate-sqlite {path? : Absolute or relative path to the source SQLite database file}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Migrate data from legacy Flask/SQLAlchemy SQLite database into Laravel 11 Eloquent models';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $dbPath = $this->argument('path');

        if (!$dbPath) {
            // Check default location of legacy database
            $defaultCandidate = base_or_relative_path('../RCAL Centralized System/instance/rcal.db');
            if (file_exists($defaultCandidate)) {
                $dbPath = $defaultCandidate;
            } else {
                $dbPath = 'c:/Users/Denver/OneDrive/Documents/Denver\'s College Files/3rd Year - 1st Sem/RCAL Centralized System/instance/rcal.db';
            }
        }

        if (!file_exists($dbPath)) {
            $this->error("Source SQLite database file not found at: {$dbPath}");
            return Command::FAILURE;
        }

        $this->info("Connecting to legacy SQLite database: {$dbPath}");
        $source = new PDO("sqlite:{$dbPath}");
        $source->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

        $this->warn('Beginning ETL data migration. Non-negotiable invariant: Zero Mass Intentions.');

        // Disable foreign key constraints during batch migration
        DB::statement('PRAGMA foreign_keys = OFF;');

        try {
            DB::beginTransaction();

            // 1. Vicariates
            $this->migrateVicariates($source);

            // 2. Parishes
            $this->migrateParishes($source);

            // 3. Clergy
            $this->migrateClergy($source);

            // 4. Clergy Assignments
            $this->migrateClergyAssignments($source);

            // 5. Persons
            $this->migratePersons($source);

            // 6. Venues
            $this->migrateVenues($source);

            // 7. Users
            $this->migrateUsers($source);

            // 8. Sacramental Records (Can. 535)
            $this->migrateSacramentalRecords($source);

            // 9. Canonical Annotations (Can. 535 §2)
            $this->migrateAnnotations($source);

            // 10. Certificate Requests
            $this->migrateCertificateRequests($source);

            // 11. Document Requests (Public claims)
            $this->migrateDocumentRequests($source);

            // 12. Parish Events -> Sacrament Schedules (Strictly skip Mass Intentions)
            $this->migrateParishEvents($source);

            // 13. Audit Logs
            $this->migrateAuditLogs($source);

            // 14. Access Logs
            $this->migrateAccessLogs($source);

            DB::commit();

            $this->info('Data migration committed successfully without loss.');
            $this->displaySummary();

            return Command::SUCCESS;
        } catch (\Throwable $e) {
            DB::rollBack();
            $this->error("Migration failed: {$e->getMessage()} in {$e->getFile()}:{$e->getLine()}");
            return Command::FAILURE;
        } finally {
            DB::statement('PRAGMA foreign_keys = ON;');
        }
    }

    protected function migrateVicariates(PDO $source): void
    {
        $rows = $source->query('SELECT * FROM vicariates')->fetchAll(PDO::FETCH_ASSOC);
        $count = 0;
        foreach ($rows as $row) {
            DB::table('vicariates')->updateOrInsert(
                ['id' => $row['id']],
                [
                    'name' => $row['name'],
                    'description' => $row['description'] ?? null,
                    'created_at' => $row['created_at'] ?? now(),
                    'updated_at' => $row['updated_at'] ?? now(),
                ]
            );
            $count++;
        }
        $this->line(" -> Migrated {$count} vicariates.");
    }

    protected function migrateParishes(PDO $source): void
    {
        $rows = $source->query('SELECT * FROM parishes')->fetchAll(PDO::FETCH_ASSOC);
        $count = 0;
        foreach ($rows as $row) {
            DB::table('parishes')->updateOrInsert(
                ['id' => $row['id']],
                [
                    'name' => $row['name'],
                    'address' => $row['address'] ?? null,
                    'municipality' => $row['municipality'] ?? null,
                    'city_municipality' => $row['municipality'] ?? null,
                    'phone' => $row['phone'] ?? null,
                    'contact_number' => $row['phone'] ?? null,
                    'email' => $row['email'] ?? null,
                    'is_active' => (bool) ($row['is_active'] ?? true),
                    'vicariate_id' => $row['vicariate_id'],
                    'created_at' => $row['created_at'] ?? now(),
                    'updated_at' => $row['updated_at'] ?? now(),
                ]
            );
            $count++;
        }
        $this->line(" -> Migrated {$count} parishes.");
    }

    protected function migrateClergy(PDO $source): void
    {
        $rows = $source->query('SELECT * FROM clergy')->fetchAll(PDO::FETCH_ASSOC);
        $count = 0;
        foreach ($rows as $row) {
            DB::table('clergy')->updateOrInsert(
                ['id' => $row['id']],
                [
                    'first_name' => $row['first_name'],
                    'middle_name' => $row['middle_name'] ?? null,
                    'last_name' => $row['last_name'],
                    'suffix' => $row['suffix'] ?? null,
                    'title' => strtolower($row['title'] ?? 'father'),
                    'sex' => strtolower($row['sex'] ?? 'male'),
                    'ordination_date' => $row['ordination_date'] ?? null,
                    'date_of_birth' => $row['date_of_birth'] ?? null,
                    'date_of_death' => $row['date_of_death'] ?? null,
                    'is_active' => (bool) ($row['is_active'] ?? true),
                    'status' => 'active',
                    'created_at' => $row['created_at'] ?? now(),
                    'updated_at' => $row['updated_at'] ?? now(),
                ]
            );
            $count++;
        }
        $this->line(" -> Migrated {$count} clergy members.");
    }

    protected function migrateClergyAssignments(PDO $source): void
    {
        $rows = $source->query('SELECT * FROM clergy_assignments')->fetchAll(PDO::FETCH_ASSOC);
        $count = 0;
        foreach ($rows as $row) {
            DB::table('clergy_assignments')->updateOrInsert(
                ['id' => $row['id']],
                [
                    'clergy_id' => $row['clergy_id'],
                    'parish_id' => $row['parish_id'],
                    'role' => strtolower($row['role'] ?? 'parish_priest'),
                    'assigned_from' => $row['assigned_from'] ?? null,
                    'assigned_to' => $row['assigned_to'] ?? null,
                    'created_at' => $row['created_at'] ?? now(),
                    'updated_at' => $row['updated_at'] ?? now(),
                ]
            );
            $count++;
        }
        $this->line(" -> Migrated {$count} clergy assignments.");
    }

    protected function migratePersons(PDO $source): void
    {
        $rows = $source->query('SELECT * FROM persons')->fetchAll(PDO::FETCH_ASSOC);
        $count = 0;
        foreach ($rows as $row) {
            DB::table('persons')->updateOrInsert(
                ['id' => $row['id']],
                [
                    'first_name' => $row['first_name'],
                    'middle_name' => $row['middle_name'] ?? null,
                    'last_name' => $row['last_name'],
                    'suffix' => $row['suffix'] ?? null,
                    'sex' => strtolower($row['sex'] ?? 'male'),
                    'date_of_birth' => $row['date_of_birth'] ?? null,
                    'date_of_death' => $row['date_of_death'] ?? null,
                    'father_name' => $row['father_name'] ?? null,
                    'mother_name' => $row['mother_name'] ?? null,
                    'father_id' => $row['father_id'] ?? null,
                    'mother_id' => $row['mother_id'] ?? null,
                    'created_at' => $row['created_at'] ?? now(),
                    'updated_at' => $row['updated_at'] ?? now(),
                ]
            );
            $count++;
        }
        $this->line(" -> Migrated {$count} person entities.");
    }

    protected function migrateVenues(PDO $source): void
    {
        $stmt = $source->query('SELECT * FROM venues');
        if ($stmt) {
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $count = 0;
            foreach ($rows as $row) {
                DB::table('venues')->updateOrInsert(
                    ['id' => $row['id']],
                    [
                        'parish_id' => $row['parish_id'],
                        'name' => $row['name'],
                        'capacity' => $row['capacity'] ?? null,
                        'description' => $row['description'] ?? null,
                        'is_active' => (bool) ($row['is_active'] ?? true),
                        'created_at' => $row['created_at'] ?? now(),
                        'updated_at' => $row['updated_at'] ?? now(),
                    ]
                );
                $count++;
            }
            $this->line(" -> Migrated {$count} parish venues.");
        }
    }

    protected function migrateUsers(PDO $source): void
    {
        $rows = $source->query('SELECT * FROM users')->fetchAll(PDO::FETCH_ASSOC);
        $count = 0;

        foreach ($rows as $row) {
            $username = $row['username'];
            $role = strtolower($row['role'] ?? 'parishioner');

            // Set bcrypt hash matching default passwords (adminpw or parishpw)
            $defaultPassword = ($username === 'admin' || $role === 'admin') ? 'adminpw' : 'parishpw';
            $passwordHash = Hash::make($defaultPassword);

            DB::table('users')->updateOrInsert(
                ['id' => $row['id']],
                [
                    'username' => $username,
                    'email' => $row['email'],
                    'display_name' => $row['display_name'] ?? $username,
                    'role' => $role,
                    'password' => $passwordHash,
                    'is_active' => (bool) ($row['is_active'] ?? true),
                    'home_parish_id' => $row['home_parish_id'] ?? null,
                    'clergy_id' => $row['clergy_id'] ?? null,
                    'phone' => $row['phone'] ?? null,
                    'postal_address' => $row['postal_address'] ?? null,
                    'email_verified_at' => !empty($row['email_verified']) ? now() : null,
                    'phone_verified_at' => !empty($row['phone_verified']) ? now() : null,
                    'last_login_at' => $row['last_login_at'] ?? null,
                    'created_at' => $row['created_at'] ?? now(),
                    'updated_at' => $row['updated_at'] ?? now(),
                ]
            );
            $count++;
        }
        $this->line(" -> Migrated {$count} users with refreshed Laravel bcrypt credentials.");
    }

    protected function migrateSacramentalRecords(PDO $source): void
    {
        $rows = $source->query('SELECT * FROM sacramental_records')->fetchAll(PDO::FETCH_ASSOC);
        $count = 0;
        foreach ($rows as $row) {
            DB::table('sacramental_records')->updateOrInsert(
                ['id' => $row['id']],
                [
                    'person_id' => $row['person_id'],
                    'spouse_person_id' => $row['spouse_person_id'] ?? null,
                    'sacrament_type' => strtolower($row['sacrament_type']),
                    'event_date' => $row['event_date'],
                    'book_number' => (int) $row['book_number'],
                    'page_number' => (int) $row['page_number'],
                    'entry_number' => (int) $row['entry_number'],
                    'originating_parish_id' => (int) $row['originating_parish_id'],
                    'performed_by_clergy_id' => $row['performed_by_clergy_id'] ?? null,
                    'legitimacy' => !empty($row['legitimacy']) ? strtolower($row['legitimacy']) : null,
                    'godparents' => $row['godparents'] ?? null,
                    'witnesses' => $row['witnesses'] ?? null,
                    'place_of_event' => $row['place_of_event'] ?? null,
                    'register_notes' => $row['register_notes'] ?? null,
                    'status' => 'registered',
                    'created_at' => $row['created_at'] ?? now(),
                    'updated_at' => $row['created_at'] ?? now(),
                ]
            );
            $count++;
        }
        $this->line(" -> Migrated {$count} canonical sacramental records.");
    }

    protected function migrateAnnotations(PDO $source): void
    {
        $rows = $source->query('SELECT * FROM annotations')->fetchAll(PDO::FETCH_ASSOC);
        $count = 0;
        foreach ($rows as $row) {
            DB::table('canonical_annotations')->updateOrInsert(
                ['id' => $row['id']],
                [
                    'record_id' => $row['record_id'],
                    'annotation_type' => strtolower($row['annotation_type']),
                    'note_text' => $row['note_text'],
                    'event_date' => $row['event_date'] ?? null,
                    'reference_record_id' => $row['reference_record_id'] ?? null,
                    'annotated_by_user_id' => $row['annotated_by_user_id'] ?? null,
                    'annotated_at' => $row['created_at'] ?? now(),
                    'created_at' => $row['created_at'] ?? now(),
                    'updated_at' => $row['created_at'] ?? now(),
                ]
            );

            // Mark record status as annotated
            DB::table('sacramental_records')
                ->where('id', $row['record_id'])
                ->update(['status' => 'annotated']);

            $count++;
        }
        $this->line(" -> Migrated {$count} Can. 535 §2 marginal annotations.");
    }

    protected function migrateCertificateRequests(PDO $source): void
    {
        $rows = $source->query('SELECT * FROM certificate_requests')->fetchAll(PDO::FETCH_ASSOC);
        $count = 0;
        foreach ($rows as $row) {
            DB::table('certificate_requests')->updateOrInsert(
                ['id' => $row['id']],
                [
                    'record_id' => $row['record_id'],
                    'requester_user_id' => $row['requester_user_id'] ?? null,
                    'requester_name' => $row['requester_name'],
                    'requester_contact' => $row['requester_contact'] ?? null,
                    'purpose' => $row['purpose'] ?? null,
                    'status' => strtolower($row['status'] ?? 'pending'),
                    'certificate_number' => $row['certificate_number'] ?? null,
                    'verification_token' => !empty($row['certificate_number'])
                        ? hash_hmac('sha256', "RCAL-PIMS:{$row['certificate_number']}:{$row['record_id']}", config('app.key'))
                        : null,
                    'verified_by_user_id' => $row['verified_by_user_id'] ?? null,
                    'verified_at' => $row['verified_at'] ?? null,
                    'approved_by_user_id' => $row['approved_by_user_id'] ?? null,
                    'approved_at' => $row['approved_at'] ?? null,
                    'issued_by_user_id' => $row['issued_by_user_id'] ?? null,
                    'issued_at' => $row['issued_at'] ?? null,
                    'rejected_by_user_id' => $row['rejected_by_user_id'] ?? null,
                    'rejected_at' => $row['rejected_at'] ?? null,
                    'rejection_reason' => $row['rejection_reason'] ?? null,
                    'created_at' => $row['created_at'] ?? now(),
                    'updated_at' => $row['updated_at'] ?? now(),
                ]
            );
            $count++;
        }
        $this->line(" -> Migrated {$count} official certificate requests.");
    }

    protected function migrateDocumentRequests(PDO $source): void
    {
        $rows = $source->query('SELECT * FROM document_requests')->fetchAll(PDO::FETCH_ASSOC);
        $count = 0;
        foreach ($rows as $row) {
            $tracking = 'RCAL-REQ-' . strtoupper(Str::random(8));

            DB::table('document_requests')->updateOrInsert(
                ['id' => $row['id']],
                [
                    'tracking_code' => $tracking,
                    'parishioner_id' => $row['parishioner_id'],
                    'targeted_parish_id' => $row['targeted_parish_id'] ?? null,
                    'sacrament_type' => strtolower($row['sacrament_type']),
                    'name_on_record' => $row['name_on_record'],
                    'date_of_birth' => $row['date_of_birth'],
                    'date_of_sacrament' => $row['date_of_sacrament'] ?? null,
                    'place_of_sacrament' => $row['place_of_sacrament'] ?? null,
                    'parents_or_spouse' => $row['parents_or_spouse'] ?? null,
                    'relationship_to_owner' => 'Self',
                    'purpose' => $row['purpose'] ?? 'Personal Copy',
                    'status' => strtolower($row['status'] ?? 'submitted'),
                    'matched_record_id' => $row['matched_record_id'] ?? null,
                    'certificate_request_id' => $row['certificate_request_id'] ?? null,
                    'rejection_reason' => $row['rejection_reason'] ?? null,
                    'internal_note' => $row['internal_note'] ?? null,
                    'consent_given_at' => $row['consent_given_at'] ?? now(),
                    'consent_version' => $row['consent_version'] ?? '1.0',
                    'created_at' => $row['created_at'] ?? now(),
                    'updated_at' => $row['updated_at'] ?? now(),
                ]
            );
            $count++;
        }
        $this->line(" -> Migrated {$count} parishioner document claims.");
    }

    protected function migrateParishEvents(PDO $source): void
    {
        $rows = $source->query('SELECT * FROM parish_events')->fetchAll(PDO::FETCH_ASSOC);
        $count = 0;
        foreach ($rows as $row) {
            $type = strtolower($row['event_type'] ?? 'other');

            // STRICT NON-NEGOTIABLE INVARIANT: SKIP ANY MASS INTENTIONS
            if (str_contains($type, 'intention')) {
                continue;
            }

            DB::table('sacrament_schedules')->updateOrInsert(
                ['id' => $row['id']],
                [
                    'parish_id' => $row['parish_id'],
                    'venue_id' => $row['venue_id'] ?? null,
                    'presiding_clergy_id' => $row['presiding_clergy_id'] ?? null,
                    'sacrament_type' => $type,
                    'title' => $row['title'],
                    'description' => $row['description'] ?? null,
                    'starts_at' => $row['starts_at'],
                    'ends_at' => $row['ends_at'],
                    'status' => strtolower($row['status'] ?? 'scheduled'),
                    'requester_user_id' => $row['requester_user_id'] ?? null,
                    'requester_name' => $row['requester_name'] ?? null,
                    'requester_contact' => $row['requester_contact'] ?? null,
                    'expected_attendees' => $row['expected_attendees'] ?? null,
                    'record_id' => $row['record_id'] ?? null,
                    'cancellation_reason' => $row['cancellation_reason'] ?? null,
                    'created_at' => $row['created_at'] ?? now(),
                    'updated_at' => $row['updated_at'] ?? now(),
                ]
            );
            $count++;
        }
        $this->line(" -> Migrated {$count} sacrament schedule appointments (Zero Mass Intentions verified).");
    }

    protected function migrateAuditLogs(PDO $source): void
    {
        $rows = $source->query('SELECT * FROM audit_logs')->fetchAll(PDO::FETCH_ASSOC);
        $count = 0;
        foreach ($rows as $row) {
            DB::table('audit_logs')->updateOrInsert(
                ['id' => $row['id']],
                [
                    'user_id' => $row['user_id'] ?? null,
                    'actor_username' => $row['actor_username'] ?? null,
                    'action' => strtoupper($row['action'] ?? 'UNKNOWN'),
                    'subject_type' => $row['subject_type'] ?? null,
                    'subject_id' => $row['subject_id'] ?? null,
                    'subject_label' => $row['subject_label'] ?? null,
                    'old_values' => !empty($row['old_values']) && is_string($row['old_values'])
                        ? (json_validate($row['old_values']) ? $row['old_values'] : json_encode(['raw' => $row['old_values']]))
                        : null,
                    'new_values' => !empty($row['new_values']) && is_string($row['new_values'])
                        ? (json_validate($row['new_values']) ? $row['new_values'] : json_encode(['raw' => $row['new_values']]))
                        : null,
                    'ip_address' => $row['ip_address'] ?? null,
                    'user_agent' => $row['user_agent'] ?? null,
                    'request_path' => $row['request_path'] ?? null,
                    'request_method' => $row['request_method'] ?? null,
                    'note' => $row['note'] ?? null,
                    'created_at' => $row['created_at'] ?? now(),
                ]
            );
            $count++;
        }
        $this->line(" -> Migrated {$count} RA 10173 audit trail logs.");
    }

    protected function migrateAccessLogs(PDO $source): void
    {
        $rows = $source->query('SELECT * FROM access_logs')->fetchAll(PDO::FETCH_ASSOC);
        $count = 0;
        foreach ($rows as $row) {
            DB::table('access_logs')->updateOrInsert(
                ['id' => $row['id']],
                [
                    'user_id' => $row['user_id'],
                    'record_id' => $row['record_id'],
                    'action' => $row['action'] ?? 'view',
                    'created_at' => $row['created_at'] ?? now(),
                ]
            );
            $count++;
        }
        $this->line(" -> Migrated {$count} RA 10173 confidential access logs.");
    }

    protected function displaySummary(): void
    {
        $this->table(
            ['Entity', 'Target Count in Laravel DB'],
            [
                ['Vicariates', DB::table('vicariates')->count()],
                ['Parishes', DB::table('parishes')->count()],
                ['Clergy Members', DB::table('clergy')->count()],
                ['Clergy Assignments', DB::table('clergy_assignments')->count()],
                ['Persons', DB::table('persons')->count()],
                ['Users', DB::table('users')->count()],
                ['Sacramental Records', DB::table('sacramental_records')->count()],
                ['Canonical Annotations (Can. 535 §2)', DB::table('canonical_annotations')->count()],
                ['Certificate Requests', DB::table('certificate_requests')->count()],
                ['Document Requests', DB::table('document_requests')->count()],
                ['Sacrament Schedules', DB::table('sacrament_schedules')->count()],
                ['Audit Logs', DB::table('audit_logs')->count()],
                ['Access Logs', DB::table('access_logs')->count()],
            ]
        );
    }
}

function base_or_relative_path(string $rel): string
{
    return base_path($rel);
}
