<?php

namespace App\Services;

/**
 * CertificateFileParserService – extracts {{placeholder}} tokens from uploaded files.
 *
 * HOW IT WORKS
 * ─────────────────────────────────────────────────────────
 * 1. The user uploads a template file (DOCX, PDF, or image).
 * 2. This service parses the file using native PHP capabilities without requiring
 *    external dependencies (such as PhpWord or external PDF binaries):
 *    - DOCX: Reads word/document.xml from the ZIP container using ZipArchive
 *            or a native binary zip unpacker with gzinflate, then strips XML tags.
 *    - PDF:  Scans text streams (both raw and FlateDecode decompressed) for tokens.
 *    - Images (PNG, JPG): No text extraction; user defines placeholders manually.
 * 3. A regex scans the extracted text for anything inside {{ and }}.
 * 4. Returns a unique, sorted list of placeholder names.
 *
 * SAFETY & RESILIENCE
 * ─────────────────────────────────────────────────────────
 * Wrapped in error handling so malformed or unusual files will never crash
 * the upload process; instead, it falls back to manual placeholder definitions.
 */
class CertificateFileParserService
{
    /** The regex pattern that matches {{placeholder}}, ${placeholder}, or {d.placeholder} tokens. */
    private const PLACEHOLDER_PATTERN = '/(?:\{\{|\$\{|\{d\.)\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*(?:\}\}|\})/';

    /**
     * Parse the given file and extract all {{placeholder}} names.
     *
     * @param  string  $filePath  Absolute path to the uploaded template file.
     * @return string[] Unique sorted list of placeholder names found.
     */
    public function extractPlaceholders(string $filePath): array
    {
        try {
            if (! file_exists($filePath)) {
                return [];
            }

            $extension = strtolower(pathinfo($filePath, PATHINFO_EXTENSION));

            $text = match ($extension) {
                'docx' => $this->extractTextFromDocx($filePath),
                'pdf' => $this->extractTextFromPdf($filePath),
                default => '', // Images and unsupported formats – manual entry.
            };

            return $this->parsePlaceholders($text);
        } catch (\Throwable) {
            // Fail safely: if any file is unparseable, return empty array so
            // the user can proceed with manual placeholders without server errors.
            return [];
        }
    }

    /**
     * Extract raw text from a DOCX file using native PHP.
     *
     * A DOCX file is a ZIP container containing word/document.xml.
     */
    private function extractTextFromDocx(string $filePath): string
    {
        // 1. Try PHP's ZipArchive if the extension is enabled
        if (class_exists(\ZipArchive::class)) {
            $zip = new \ZipArchive;
            if ($zip->open($filePath) === true) {
                $xml = $zip->getFromName('word/document.xml');
                $zip->close();
                if ($xml) {
                    return strip_tags(str_replace(['<w:p>', '<w:tab/>', '<w:br/>'], ["\n", "\t", "\n"], $xml));
                }
            }
        }

        // 2. Pure PHP fallback: read ZIP local headers directly without extensions
        return $this->extractDocxPurePhp($filePath);
    }

    /**
     * Parse ZIP container headers in pure PHP and decompress word/document.xml.
     */
    private function extractDocxPurePhp(string $filePath): string
    {
        $handle = @fopen($filePath, 'rb');
        if (! $handle) {
            return '';
        }

        $text = '';
        while (! feof($handle)) {
            $sig = fread($handle, 4);
            if ($sig !== "PK\x03\x04") {
                break;
            }

            $rawHeader = fread($handle, 26);
            if (strlen($rawHeader) < 26) {
                break;
            }

            $info = unpack('vver/vflag/vmethod/vmodtime/vmoddate/Vcrc/Vcsize/Vusize/vnamelen/vextralen', $rawHeader);
            $name = $info['namelen'] > 0 ? fread($handle, $info['namelen']) : '';
            $extra = $info['extralen'] > 0 ? fread($handle, $info['extralen']) : '';
            $cdata = $info['csize'] > 0 ? fread($handle, $info['csize']) : '';

            if ($name === 'word/document.xml') {
                $xml = ($info['method'] === 8 && function_exists('gzinflate'))
                    ? @gzinflate($cdata)
                    : $cdata;

                if ($xml) {
                    $text = strip_tags(str_replace(['<w:p>', '<w:tab/>', '<w:br/>'], ["\n", "\t", "\n"], $xml));
                }
                break;
            }
        }
        fclose($handle);

        return $text;
    }

    /**
     * Extract text and placeholders from a PDF file using stream decoding.
     */
    private function extractTextFromPdf(string $filePath): string
    {
        $content = @file_get_contents($filePath);
        if (! $content) {
            return '';
        }

        $extracted = $content;

        // Extract FlateDecode compressed streams if present
        if (preg_match_all('/stream[\r\n]+(.*?)[\r\n]+endstream/s', $content, $matches)) {
            foreach ($matches[1] as $stream) {
                $uncompressed = false;
                if (function_exists('gzuncompress')) {
                    $uncompressed = @gzuncompress($stream);
                }
                if ($uncompressed === false && function_exists('gzinflate')) {
                    $uncompressed = @gzinflate($stream);
                }
                if ($uncompressed) {
                    $extracted .= ' '.$uncompressed;
                }
            }
        }

        return $extracted;
    }

    /**
     * Scan the text for {{placeholder}} tokens and return unique, sorted names.
     *
     * @param  string  $text  The raw text extracted from the file.
     * @return string[] Unique sorted placeholder names.
     */
    private function parsePlaceholders(string $text): array
    {
        preg_match_all(self::PLACEHOLDER_PATTERN, $text, $matches);

        // $matches[1] contains the captured group (the placeholder name without braces).
        $placeholders = array_unique($matches[1] ?? []);
        sort($placeholders);

        return array_values($placeholders);
    }

    /**
     * Normalize placeholders in a DOCX file to Carbone syntax: {d.placeholder_name}.
     * Handles ${var}, {{var}}, ${d.var}, and {{d.var}}.
     */
    public function normalizeDocxForCarbone(string $filePath): bool
    {
        if (! file_exists($filePath) || ! class_exists(\ZipArchive::class)) {
            return false;
        }

        try {
            $zip = new \ZipArchive;
            if ($zip->open($filePath) !== true) {
                return false;
            }

            $modified = false;
            $xmlFiles = ['word/document.xml', 'word/header1.xml', 'word/header2.xml', 'word/footer1.xml', 'word/footer2.xml'];

            foreach ($xmlFiles as $xmlFile) {
                $content = $zip->getFromName($xmlFile);
                if ($content === false) {
                    continue;
                }

                // 1. Replace ${d.something} and {{d.something}} -> {d.something}
                $newContent = preg_replace('/(?:\$\{|\{\{)d\.([a-zA-Z_][a-zA-Z0-9_]*)(?:\}\}|\})/', '{d.$1}', $content);

                // 2. Replace ${something} and {{something}} (not starting with d.) -> {d.something}
                $newContent = preg_replace('/(?:\$\{|\{\{)(?!d\.)([a-zA-Z_][a-zA-Z0-9_]*)(?:\}\}|\})/', '{d.$1}', $newContent);

                if ($newContent !== $content) {
                    $zip->addFromString($xmlFile, $newContent);
                    $modified = true;
                }
            }

            $zip->close();

            return $modified;
        } catch (\Throwable) {
            return false;
        }
    }
}
