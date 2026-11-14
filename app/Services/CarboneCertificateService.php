<?php

namespace App\Services;

use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class CarboneCertificateService
{
    protected string $apiUrl;

    protected string $apiKey;

    protected string $version;

    protected bool $verifySsl;

    protected int $timeout;

    public function __construct()
    {
        $this->apiUrl = rtrim(config('services.carbone.url', 'https://api.carbone.io'), '/');
        $this->apiKey = (string) config('services.carbone.key', '');
        $this->version = (string) config('services.carbone.version', '5');
        $this->verifySsl = (bool) config('services.carbone.verify_ssl', false);
        $this->timeout = (int) config('services.carbone.timeout', 180);
    }

    /**
     * Get an HTTP client pre-configured with headers, timeout, and SSL settings.
     */
    protected function client(?int $customTimeout = null): PendingRequest
    {
        $timeout = $customTimeout ?? $this->timeout;
        $http = Http::timeout($timeout)->connectTimeout(25);

        if (! $this->verifySsl) {
            $http = $http->withoutVerifying();
        }

        return $http->withHeaders([
            'Authorization' => "Bearer {$this->apiKey}",
            'carbone-version' => $this->version,
            'User-Agent' => 'RCAL-PIMS/1.0',
            'Connection' => 'close',
        ])->withOptions([
            'version' => 1.1,
        ]);
    }

    /**
     * Upload a DOCX template file to Carbone and cache its templateId by file hash.
     */
    public function getOrUploadTemplateId(string $templateFilePath): string
    {
        if (! file_exists($templateFilePath)) {
            throw new RuntimeException("Template file not found at [{$templateFilePath}]");
        }

        $fileHash = md5_file($templateFilePath);
        $cacheFile = storage_path('app/templates/.carbone_cache.json');

        // 1. Check local persistent disk map (instant 0ms lookup, no DB dependencies)
        if (file_exists($cacheFile)) {
            try {
                $diskMap = json_decode((string) file_get_contents($cacheFile), true);
                if (is_array($diskMap) && ! empty($diskMap[$fileHash])) {
                    return (string) $diskMap[$fileHash];
                }
            } catch (\Throwable) {
                // Continue to next check
            }
        }

        // 2. Check Laravel file cache store (avoids remote database cache)
        $cacheKey = "carbone_template_id_{$fileHash}";
        try {
            $cached = Cache::store('file')->get($cacheKey);
            if ($cached) {
                $this->saveToDiskCache($cacheFile, $fileHash, (string) $cached);

                return (string) $cached;
            }
        } catch (\Throwable) {
            // Gracefully proceed if cache store is unavailable
        }

        // 3. Upload template to Carbone
        $response = $this->client()->attach(
            'template',
            (string) file_get_contents($templateFilePath),
            basename($templateFilePath)
        )->post("{$this->apiUrl}/template");

        if (! $response->successful() || ! isset($response['data']['templateId'])) {
            throw new RuntimeException('Carbone template upload failed: '.$response->body());
        }

        $templateId = (string) $response['data']['templateId'];

        // 4. Save to both local disk JSON and file cache
        $this->saveToDiskCache($cacheFile, $fileHash, $templateId);
        try {
            Cache::store('file')->put($cacheKey, $templateId, now()->addDays(30));
        } catch (\Throwable) {
            // Ignore cache error
        }

        return $templateId;
    }

    /**
     * Save template ID mapping directly to storage disk.
     */
    protected function saveToDiskCache(string $cacheFile, string $key, string $templateId): void
    {
        try {
            $map = [];
            if (file_exists($cacheFile)) {
                $map = json_decode((string) file_get_contents($cacheFile), true) ?: [];
            }
            $map[$key] = $templateId;
            @file_put_contents($cacheFile, json_encode($map, JSON_PRETTY_PRINT));
        } catch (\Throwable) {
            // Ignore disk write failure
        }
    }

    /**
     * Resolve a Carbone template ID by its name or alias deployed in Carbone Studio (e.g. "baptismal").
     */
    public function resolveDeployedTemplateId(string $nameOrId): string
    {
        $nameOrId = trim($nameOrId);
        $cacheFile = storage_path('app/templates/.carbone_cache.json');
        $cacheKey = 'deployed_template_'.strtolower($nameOrId);

        // 1. Check local persistent disk cache first
        if (file_exists($cacheFile)) {
            try {
                $diskMap = json_decode((string) file_get_contents($cacheFile), true);
                if (is_array($diskMap) && ! empty($diskMap[$cacheKey])) {
                    return (string) $diskMap[$cacheKey];
                }
            } catch (\Throwable) {
                // Ignore
            }
        }

        // 2. Query Carbone API to list templates in the account and match by name or Studio ID
        try {
            $response = $this->client(30)->get("{$this->apiUrl}/templates");
            if ($response->successful()) {
                $templates = $response->json('data') ?? [];
                if (is_array($templates)) {
                    foreach ($templates as $tmpl) {
                        $tmplName = $tmpl['name'] ?? '';
                        $tmplId = $tmpl['id'] ?? '';
                        $tmplVersionId = $tmpl['versionId'] ?? '';
                        if (strcasecmp($tmplName, $nameOrId) === 0 || strcasecmp($tmplId, $nameOrId) === 0 || strcasecmp($tmplVersionId, $nameOrId) === 0) {
                            $resolved = (string) ($tmplVersionId ?: ($tmplId ?: $tmpl['templateId'] ?? ''));
                            if ($resolved !== '') {
                                $this->saveToDiskCache($cacheFile, $cacheKey, $resolved);

                                return $resolved;
                            }
                        }
                    }
                }
            }
        } catch (\Throwable) {
            // Proceed to direct fallback
        }

        // 3. Fallback: use $nameOrId directly (it may be an alias or direct templateId)
        $this->saveToDiskCache($cacheFile, $cacheKey, $nameOrId);

        return $nameOrId;
    }

    /**
     * Render using a deployed template from Carbone Studio (by name or ID).
     */
    public function renderDeployed(string $templateNameOrId, array $data, string $format = 'pdf'): string
    {
        @set_time_limit(240);

        $templateId = $this->resolveDeployedTemplateId($templateNameOrId);

        return $this->executeRender($templateId, $data, $format);
    }

    /**
     * Render the document into a PDF (for in-browser preview) or DOCX (for download).
     *
     * @param  string  $templatePath  Absolute path to local DOCX template
     * @param  array<string, mixed>  $data  Dataset matching {d.placeholder}
     * @param  string  $format  'pdf' or 'docx'
     * @return string Raw binary string of the rendered document
     */
    public function render(string $templatePath, array $data, string $format = 'pdf'): string
    {
        @set_time_limit(240);

        $templateId = $this->getOrUploadTemplateId($templatePath);

        return $this->executeRender($templateId, $data, $format);
    }

    /**
     * Execute render for a known templateId, download the file, and cache on disk.
     */
    protected function executeRender(string $templateId, array $data, string $format = 'pdf'): string
    {
        // 1. Check disk cache for previously rendered file with identical data (instant 0ms response)
        $renderHash = md5($templateId.serialize($data).$format);
        $cacheDir = storage_path('app/private/rendered_certs');
        $cachedRenderPath = "{$cacheDir}/{$renderHash}.{$format}";

        if (file_exists($cachedRenderPath) && (time() - filemtime($cachedRenderPath)) < 3600) {
            $cachedContent = @file_get_contents($cachedRenderPath);
            if ($cachedContent !== false && strlen($cachedContent) > 1000) {
                return $cachedContent;
            }
        }

        // 2. Request Carbone Render
        $renderResponse = $this->client()->post("{$this->apiUrl}/render/{$templateId}", [
            'data' => $data,
            'convertTo' => $format,
        ]);

        if (! $renderResponse->successful() || ! isset($renderResponse['data']['renderId'])) {
            throw new RuntimeException('Carbone render failed: '.$renderResponse->body());
        }

        $renderId = (string) $renderResponse['data']['renderId'];

        // 3. Download the Rendered File Binary using sink to avoid OpenSSL buffer resets
        if (! is_dir($cacheDir)) {
            @mkdir($cacheDir, 0755, true);
        }

        $tempDownloadPath = "{$cacheDir}/tmp_{$renderHash}.{$format}";

        $fileResponse = $this->client($this->timeout)->sink($tempDownloadPath)->get("{$this->apiUrl}/render/{$renderId}");

        if (! $fileResponse->successful() || ! file_exists($tempDownloadPath) || filesize($tempDownloadPath) < 500) {
            @unlink($tempDownloadPath);
            throw new RuntimeException('Failed to download rendered document from Carbone: '.$fileResponse->body());
        }

        @rename($tempDownloadPath, $cachedRenderPath);

        return (string) file_get_contents($cachedRenderPath);
    }
}
