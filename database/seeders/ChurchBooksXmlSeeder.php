<?php

namespace Database\Seeders;

use App\Enums\LegitimacyStatusEnum;
use App\Enums\SacramentTypeEnum;
use App\Models\Clergy;
use App\Models\Parish;
use App\Models\Person;
use App\Models\SacramentalRecord;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class ChurchBooksXmlSeeder extends Seeder
{
    public function run(): void
    {
        $parish = Parish::first() ?? Parish::create([
            'name' => 'St. Joseph the Worker Parish',
            'vicariate_id' => 1,
            'address' => 'Inosluban Lipa City Batangas',
            'phone' => '(043)-321-9447',
            'email' => 'stjosephtheworker.rcal@gmail.com',
            'is_active' => true,
        ]);

        $this->seedBaptisms($parish->id);
        $this->seedConfirmations($parish->id);
    }

    private function seedBaptisms(int $parishId): void
    {
        $xmlPath = 'C:/Users/Mikos Bryle Pamplona/.gemini/antigravity/brain/612b6ede-9a26-4d35-a5bb-595f8e8806ac/.user_uploaded/media_1794410935716_a738204a.xml';
        if (! file_exists($xmlPath)) {
            return;
        }

        $xml = simplexml_load_file($xmlPath);
        if (! $xml) {
            return;
        }

        foreach ($xml->record as $rec) {
            $no = (int) $rec->no;
            $nameStr = trim((string) $rec->baptizatorum_nomina_et_cognomina);
            $parts = explode(' ', $nameStr);
            $lastName = count($parts) > 1 ? array_pop($parts) : 'Unknown';
            $firstName = implode(' ', $parts) ?: $nameStr;

            // Birth date
            $bYear = (int) $rec->nativitatis_annus;
            $bDateStr = trim((string) $rec->nativitatis_mensis_et_dies);
            $birthDate = null;
            try {
                $birthDate = Carbon::parse("{$bDateStr} {$bYear}")->toDateString();
            } catch (\Throwable) {
                $birthDate = "{$bYear}-01-01";
            }

            // Event date
            $eYear = (int) $rec->baptismi_annus;
            $eDateStr = trim((string) $rec->baptismi_mensis_et_dies);
            $eventDate = null;
            try {
                $eventDate = Carbon::parse("{$eDateStr} {$eYear}")->toDateString();
            } catch (\Throwable) {
                $eventDate = "{$eYear}-01-01";
            }

            // Parents
            $parentStr = trim((string) $rec->parentum_nomina_et_cognomina);
            $parentParts = array_map('trim', explode('/', $parentStr));
            $father = $parentParts[0] ?? null;
            $mother = $parentParts[1] ?? null;

            // Clergy
            $ministerName = trim((string) $rec->nomen_ministri);
            $clergyId = null;
            if ($ministerName) {
                $clergy = Clergy::firstOrCreateFromGuestName($ministerName, $parishId);
                $clergyId = $clergy->id;
            }

            $person = Person::firstOrCreate(
                ['first_name' => $firstName, 'last_name' => $lastName],
                [
                    'sex' => 'unknown',
                    'date_of_birth' => $birthDate,
                    'place_of_birth' => trim((string) $rec->nativitatis_locus),
                    'father_name' => $father,
                    'mother_name' => $mother,
                ]
            );

            $legitimacy = strtolower(trim((string) $rec->nativitatis_legitimitas)) === 'leg'
                ? LegitimacyStatusEnum::LEGITIMATE
                : LegitimacyStatusEnum::ILLEGITIMATE;

            // Check if record exists for this citation
            $bookNum = 1;
            $pageNum = (int) ceil($no / 5);
            $entryNum = $no;

            $record = SacramentalRecord::where('originating_parish_id', $parishId)
                ->where('sacrament_type', SacramentTypeEnum::BAPTISM)
                ->where('book_number', $bookNum)
                ->where('page_number', $pageNum)
                ->where('entry_number', $entryNum)
                ->first();

            $bookData = [
                'no' => $no,
                'baptismi_annus' => (string) $rec->baptismi_annus,
                'baptismi_mensis_et_dies' => (string) $rec->baptismi_mensis_et_dies,
                'baptizatorum_nomina_et_cognomina' => $nameStr,
                'nativitatis_annus' => (string) $rec->nativitatis_annus,
                'nativitatis_mensis_et_dies' => (string) $rec->nativitatis_mensis_et_dies,
                'nativitatis_legitimitas' => (string) $rec->nativitatis_legitimitas,
                'nativitatis_locus' => (string) $rec->nativitatis_locus,
                'parentum_nomina_et_cognomina' => $parentStr,
                'parentum_originis_locus' => (string) $rec->parentum_originis_locus,
                'parentum_habitationis_locus' => (string) $rec->parentum_habitationis_locus,
                'patrinorum_nomina_et_cognomina' => (string) $rec->patrinorum_nomina_et_cognomina,
                'patrinorum_habitationis_locus' => (string) $rec->patrinorum_habitationis_locus,
                'stipendium_pesos' => (string) $rec->stipendium_pesos,
                'stipendium_cts' => (string) $rec->stipendium_cts,
                'nomen_ministri' => $ministerName,
                'observanda' => (string) $rec->observanda,
            ];

            if ($record) {
                $record->allowCitationUpdate = true;
                $record->update([
                    'person_id' => $person->id,
                    'event_date' => $eventDate,
                    'legitimacy' => $legitimacy,
                    'godparents' => trim((string) $rec->patrinorum_nomina_et_cognomina),
                    'place_of_event' => trim((string) $rec->nativitatis_locus),
                    'performed_by_clergy_id' => $clergyId,
                    'register_notes' => (string) $rec->observanda,
                    'book_data' => $bookData,
                ]);
            } else {
                SacramentalRecord::create([
                    'person_id' => $person->id,
                    'sacrament_type' => SacramentTypeEnum::BAPTISM,
                    'event_date' => $eventDate,
                    'book_number' => $bookNum,
                    'page_number' => $pageNum,
                    'entry_number' => $entryNum,
                    'originating_parish_id' => $parishId,
                    'performed_by_clergy_id' => $clergyId,
                    'legitimacy' => $legitimacy,
                    'godparents' => trim((string) $rec->patrinorum_nomina_et_cognomina),
                    'place_of_event' => trim((string) $rec->nativitatis_locus),
                    'register_notes' => (string) $rec->observanda,
                    'book_data' => $bookData,
                    'status' => 'registered',
                ]);
            }
        }
    }

    private function seedConfirmations(int $parishId): void
    {
        $xmlPath = 'C:/Users/Mikos Bryle Pamplona/.gemini/antigravity/brain/612b6ede-9a26-4d35-a5bb-595f8e8806ac/.user_uploaded/media_1794410935791_22952f96.xml';
        if (! file_exists($xmlPath)) {
            return;
        }

        $xml = simplexml_load_file($xmlPath);
        if (! $xml) {
            return;
        }

        foreach ($xml->record as $rec) {
            $no = (int) $rec->no;
            $nameStr = trim((string) $rec->confirmatorum);
            $parts = explode(' ', $nameStr);
            $lastName = count($parts) > 1 ? array_pop($parts) : 'Unknown';
            $firstName = implode(' ', $parts) ?: $nameStr;

            $eYear = (int) $rec->annus;
            $eDateStr = trim((string) $rec->mensis_et_dies);
            $eventDate = null;
            try {
                $eventDate = Carbon::parse("{$eDateStr} {$eYear}")->toDateString();
            } catch (\Throwable) {
                $eventDate = "{$eYear}-01-01";
            }

            $aetas = (int) $rec->aetas;
            $approxDob = $eventDate ? Carbon::parse($eventDate)->subYears($aetas)->toDateString() : null;

            // Parents
            $parentStr = trim((string) $rec->parentum);
            $parentParts = array_map('trim', explode('/', $parentStr));
            $father = $parentParts[0] ?? null;
            $mother = $parentParts[1] ?? null;

            $ministerName = trim((string) $rec->nomen_ministri);
            $clergyId = null;
            if ($ministerName) {
                $clergy = Clergy::firstOrCreateFromGuestName($ministerName, $parishId);
                $clergyId = $clergy->id;
            }

            $person = Person::firstOrCreate(
                ['first_name' => $firstName, 'last_name' => $lastName],
                [
                    'sex' => 'unknown',
                    'date_of_birth' => $approxDob,
                    'place_of_birth' => trim((string) $rec->locus_baptismi),
                    'father_name' => $father,
                    'mother_name' => $mother,
                ]
            );

            $bookNum = 1;
            $pageNum = (int) ceil($no / 5);
            $entryNum = $no;

            $record = SacramentalRecord::where('originating_parish_id', $parishId)
                ->where('sacrament_type', SacramentTypeEnum::CONFIRMATION)
                ->where('book_number', $bookNum)
                ->where('page_number', $pageNum)
                ->where('entry_number', $entryNum)
                ->first();

            $bookData = [
                'no' => $no,
                'annus' => (string) $rec->annus,
                'mensis_et_dies' => (string) $rec->mensis_et_dies,
                'confirmatorum' => $nameStr,
                'aetas' => (string) $rec->aetas,
                'parochia' => (string) $rec->parochia,
                'provincia' => (string) $rec->provincia,
                'locus_baptismi' => (string) $rec->locus_baptismi,
                'parentum' => $parentStr,
                'patrinorum' => (string) $rec->patrinorum,
                'stipendium_pesos' => (string) $rec->stipendium_pesos,
                'stipendium_cts' => (string) $rec->stipendium_cts,
                'nomen_ministri' => $ministerName,
                'observanda' => (string) $rec->observanda,
            ];

            if ($record) {
                $record->allowCitationUpdate = true;
                $record->update([
                    'person_id' => $person->id,
                    'event_date' => $eventDate,
                    'godparents' => trim((string) $rec->patrinorum),
                    'place_of_event' => trim((string) $rec->locus_baptismi),
                    'performed_by_clergy_id' => $clergyId,
                    'register_notes' => (string) $rec->observanda,
                    'book_data' => $bookData,
                ]);
            } else {
                SacramentalRecord::create([
                    'person_id' => $person->id,
                    'sacrament_type' => SacramentTypeEnum::CONFIRMATION,
                    'event_date' => $eventDate,
                    'book_number' => $bookNum,
                    'page_number' => $pageNum,
                    'entry_number' => $entryNum,
                    'originating_parish_id' => $parishId,
                    'performed_by_clergy_id' => $clergyId,
                    'godparents' => trim((string) $rec->patrinorum),
                    'place_of_event' => trim((string) $rec->locus_baptismi),
                    'register_notes' => (string) $rec->observanda,
                    'book_data' => $bookData,
                    'status' => 'registered',
                ]);
            }
        }
    }
}
