<?php

declare(strict_types=1);

const KASSALAPP_BASE_URL = 'https://kassal.app/api/v1';
const KASSALAPP_CACHE_DIR = __DIR__ . '/../.cache';

function matpris_json(array $payload, int $status = 200): never {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function matpris_env(string $key): string {
    $value = getenv($key);
    if (is_string($value) && trim($value) !== '') return trim($value);
    $root = dirname(__DIR__, 3);
    foreach ([$root . DIRECTORY_SEPARATOR . '.env', $root . DIRECTORY_SEPARATOR . '.env.local'] as $rootEnv) {
        if (!is_file($rootEnv)) continue;
        foreach (file($rootEnv, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [] as $line) {
            $line = trim($line);
            if ($line === '' || str_starts_with($line, '#') || !str_contains($line, '=')) continue;
            [$name, $candidate] = explode('=', $line, 2);
            if (trim($name) === $key) return trim($candidate, " \t\"'");
        }
    }
    return '';
}

function matpris_cache_key(string $path, array $query): string {
    ksort($query);
    return hash('sha256', $path . '?' . http_build_query($query));
}

function matpris_cached(string $key, int $ttl): ?array {
    $file = KASSALAPP_CACHE_DIR . DIRECTORY_SEPARATOR . $key . '.json';
    if (!is_file($file) || filemtime($file) + $ttl < time()) return null;
    $decoded = json_decode((string)file_get_contents($file), true);
    return is_array($decoded) ? $decoded : null;
}

function matpris_store_cache(string $key, array $payload): void {
    if (!is_dir(KASSALAPP_CACHE_DIR)) @mkdir(KASSALAPP_CACHE_DIR, 0700, true);
    @file_put_contents(KASSALAPP_CACHE_DIR . DIRECTORY_SEPARATOR . $key . '.json', json_encode($payload, JSON_UNESCAPED_UNICODE), LOCK_EX);
}

function matpris_request(string $path, array $query, int $ttl): void {
    $token = matpris_env('KASSALAPP_API_KEY');
    if ($token === '') matpris_json(['error' => 'API-nøkkel er ikke konfigurert.'], 503);
    $key = matpris_cache_key($path, $query);
    $cached = matpris_cached($key, $ttl);
    if ($cached !== null) matpris_json($cached);

    $url = KASSALAPP_BASE_URL . '/' . ltrim($path, '/') . ($query ? '?' . http_build_query($query) : '');
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => false,
        CURLOPT_TIMEOUT => 12,
        CURLOPT_HTTPHEADER => ['Accept: application/json', 'Authorization: Bearer ' . $token],
        CURLOPT_USERAGENT => 'FolkNettside Matprissok/1.0',
    ]);
    $body = curl_exec($ch);
    $status = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    curl_close($ch);
    if ($body === false || $status === 429) matpris_json(['error' => $status === 429 ? 'For mange forespørsler akkurat nå.' : 'Kunne ikke hente priser akkurat nå.'], $status === 429 ? 429 : 502);
    $payload = json_decode((string)$body, true);
    if (!is_array($payload)) matpris_json(['error' => 'Ugyldig svar fra pristjenesten.'], 502);
    if ($status >= 400) matpris_json(['error' => 'Pristjenesten svarte med en feil.'], $status);
    matpris_store_cache($key, $payload);
    matpris_json($payload);
}
