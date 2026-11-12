<?php

namespace App\Services;

use App\Models\SacramentalRecord;

/**
 * CertificateAutoPopulatorService – fills certificate fields for Baptism and Confirmation.
 *
 * Provides both raw and formatted values matching the official RCAL
 * St. Joseph the Worker Parish certificate layout.
 */
class CertificateAutoPopulatorService
{
    /**
     * Build a placeholder → value map from a sacramental record.
     *
     * @param  SacramentalRecord  $record  The record to pull data from.
     * @param  string[]  $placeholders  List of placeholder names the template expects.
     * @param  array<string, string>  $overrides  Manual overrides from the user.
     * @return array<string, string> Mapping of placeholder_name → populated value.
     */
    public function populate(SacramentalRecord $record, array $placeholders = [], array $overrides = []): array
    {
        // Eager-load relationships
        $record->loadMissing(['person', 'spouse', 'originatingParish', 'performedByClergy']);

        // Build the complete data map
        $dataMap = $this->buildDataMap($record);

        // Merge any user-supplied manual overrides
        $dataMap = array_merge($dataMap, array_filter($overrides, fn ($v) => $v !== null));

        if (! empty($placeholders)) {
            $result = [];
            foreach ($placeholders as $placeholder) {
                $result[$placeholder] = $dataMap[$placeholder] ?? '';
            }

            // Always preserve core fields even if not explicitly listed in placeholders
            return array_merge($dataMap, $result);
        }

        return $dataMap;
    }

    /**
     * Build the data map for Baptism or Confirmation certificates.
     *
     * @return array<string, string>
     */
    public function buildDataMap(SacramentalRecord $record): array
    {
        $person = $record->person;
        $parish = $record->originatingParish;
        $clergy = $record->performedByClergy;

        $isBaptism = ($record->sacrament_type?->value ?? '') === 'baptism';

        $bookData = is_array($record->book_data) ? $record->book_data : [];

        // Parents text
        $father = $person?->father_name ?? '';
        $mother = $person?->mother_name ?? '';
        if ((! $father || ! $mother) && ! empty($bookData['parentum_nomina_et_cognomina'])) {
            $pParts = array_map('trim', explode('/', $bookData['parentum_nomina_et_cognomina']));
            $father = $father ?: ($pParts[0] ?? '');
            $mother = $mother ?: ($pParts[1] ?? '');
        } elseif ((! $father || ! $mother) && ! empty($bookData['parentum'])) {
            $pParts = array_map('trim', explode('/', $bookData['parentum']));
            $father = $father ?: ($pParts[0] ?? '');
            $mother = $mother ?: ($pParts[1] ?? '');
        }

        $parentsText = '';
        if ($father && $mother) {
            $parentsText = "Child of {$father} & {$mother}";
        } elseif ($father) {
            $parentsText = "Child of {$father}";
        } elseif ($mother) {
            $parentsText = "Child of {$mother}";
        } elseif ($person?->parent_names) {
            $parentsText = "Child of {$person->parent_names}";
        } elseif (! empty($bookData['parentum_nomina_et_cognomina'])) {
            $parentsText = "Child of {$bookData['parentum_nomina_et_cognomina']}";
        } elseif (! empty($bookData['parentum'])) {
            $parentsText = "Child of {$bookData['parentum']}";
        }

        // Format dates nicely (e.g., "21st day of October 2024")
        $birthDateFormatted = '';
        if ($person?->date_of_birth) {
            $birthDateFormatted = 'Born on the '.$person->date_of_birth->format('jS \d\a\y \o\f F Y');
        } elseif (! empty($bookData['nativitatis_mensis_et_dies']) && ! empty($bookData['nativitatis_annus'])) {
            $birthDateFormatted = "Born on the {$bookData['nativitatis_mensis_et_dies']}, {$bookData['nativitatis_annus']}";
        }

        $eventDateFormatted = '';
        if ($record->event_date) {
            $eventDateFormatted = $record->event_date->format('jS \d\a\y \o\f F, \y\e\a\r \o\f \o\u\r \L\o\r\d Y');
        }

        // Sponsors
        $sponsors = $record->godparents ?: ($record->witnesses ?: ($bookData['patrinorum_nomina_et_cognomina'] ?? ($bookData['patrinorum'] ?? '')));

        // Place of birth
        $placeOfBirth = $person?->place_of_birth ?: ($bookData['nativitatis_locus'] ?? ($bookData['locus_baptismi'] ?? ($record->place_of_event ?: 'Lipa City, Batangas')));

        // Minister
        $ministerName = $clergy?->titled_name ?? $clergy?->full_name ?? ($bookData['nomen_ministri'] ?? ($isBaptism ? 'Rev. Fr. Aren Bejasa, OSJ' : 'Fr. Dale Anthony Q. Barretto Ko'));

        return [
            // Core identity
            'recipient_name' => strtoupper($person?->full_name ?: ($bookData['baptizatorum_nomina_et_cognomina'] ?? ($bookData['confirmatorum'] ?? ''))),
            'parents' => $parentsText,
            'father_name' => $father,
            'mother_name' => $mother,

            // Birth info
            'date_of_birth' => $person?->date_of_birth?->format('F j, Y') ?? '',
            'formatted_birth_date' => $birthDateFormatted,
            'place_of_birth' => $placeOfBirth,

            // Sacrament details
            'sacrament_type' => $record->sacrament_type?->value ?? ($isBaptism ? 'baptism' : 'confirmation'),
            'sacrament_title' => $isBaptism ? 'Holy Sacrament of Baptism' : 'Holy Sacrament of Confirmation',
            'certificate_title' => $isBaptism ? 'CERTIFICATE OF BAPTISM' : 'CERTIFICATE OF CONFIRMATION',
            'event_date' => $record->event_date?->format('F j, Y') ?? '',
            'formatted_event_date' => $eventDateFormatted,

            // Minister & Parish
            'minister_name' => $ministerName,
            'parish_name' => $parish?->name ?? 'St. Joseph the Worker Parish',
            'parish_address' => $parish?->address ?? 'Inosluban Lipa City Batangas',
            'parish_email' => $parish?->email ?? 'stjosephtheworker.rcal@gmail.com',
            'parish_contact' => $parish?->contact_number ?? '(043)-321-9447/ 0975-897-8022',

            // Sponsors
            'sponsors' => $sponsors,

            // Register citation
            'book_number' => (string) ($record->book_number ?? '1'),
            'page_number' => (string) ($record->page_number ?? ($isBaptism ? '89' : '50')),
            'line_number' => (string) ($record->entry_number ?? ($isBaptism ? '6' : '7')),
            'citation' => $record->citation ?? '',

            // Signatories
            'clerk_name' => $isBaptism ? 'Elsie E. Balita' : 'Elsie Balita',
            'clerk_title' => 'Parish Clerk',
            'priest_name' => 'Rev. Fr. Dale Anthony Q. Barretto Ko',
            'priest_title' => 'Parish Priest',

            // Metadata
            'issue_date' => now()->format('F j, Y'),
            'purpose' => 'FOR REFERENCE',
        ];
    }
}
