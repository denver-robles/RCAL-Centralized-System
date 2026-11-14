<?php

namespace Tests\Unit;

use App\Services\CertificateFileParserService;
use PHPUnit\Framework\TestCase;

class CertificateFileParserServiceTest extends TestCase
{
    public function test_can_instantiate_and_parse_placeholders_safely(): void
    {
        $service = new CertificateFileParserService;

        // Non-existent file should safely return empty array
        $result = $service->extractPlaceholders('non_existent_file.docx');
        $this->assertIsArray($result);
        $this->assertEmpty($result);
    }
}
