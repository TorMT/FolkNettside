<?php
function aps_repo_root() {
    return realpath(__DIR__ . '/../../../');
}

function aps_json_response($data, int $code = 200): void {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
    exit;
}

function aps_error($message, int $code = 500, array $extra = []): void {
    aps_json_response(array_merge(['error' => $message], $extra), $code);
}

function aps_resolve_config_path(?string $config): string {
    $config = trim((string)($config ?? ''));
    if ($config === '') {
        return aps_repo_root() . DIRECTORY_SEPARATOR . 'diverse' . DIRECTORY_SEPARATOR . 'Njord' . DIRECTORY_SEPARATOR . 'aps-config.json';
    }
    $candidate = str_replace(['..', '\'], ['', '/'], $config);
    $candidate = ltrim($candidate, '/');
    if (!str_ends_with(strtolower($candidate), 'aps-config.json')) {
        aps_error('Config path must point to an aps-config.json file.', 400);
    }
    $full = realpath(aps_repo_root() . DIRECTORY_SEPARATOR . $candidate);
    if (!$full || !str_starts_with($full, aps_repo_root())) {
        aps_error('Invalid config path.', 400);
    }
    return $full;
}

function aps_read_json_file(string $path): array {
    if (!is_file($path)) {
        aps_error('Missing file: ' . $path, 404);
    }
    $raw = file_get_contents($path);
    $data = json_decode($raw ?: '', true);
    if (!is_array($data)) {
        aps_error('Invalid JSON in ' . basename($path), 500);
    }
    return $data;
}

function aps_load_secrets(): array {
    $secretPath = aps_repo_root() . DIRECTORY_SEPARATOR . 'secrets' . DIRECTORY_SEPARATOR . 'aps.local.json';
    if (is_file($secretPath)) {
        $data = aps_read_json_file($secretPath);
        return [
            'clientId' => $data['clientId'] ?? $data['APS_CLIENT_ID'] ?? '',
            'clientSecret' => $data['clientSecret'] ?? $data['APS_CLIENT_SECRET'] ?? '',
        ];
    }
    return [
        'clientId' => getenv('APS_CLIENT_ID') ?: '',
        'clientSecret' => getenv('APS_CLIENT_SECRET') ?: '',
    ];
}

function aps_http_json(string $url, string $method = 'GET', ?array $headers = null, ?string $body = null): array {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_HTTPHEADER => $headers ?: [],
        CURLOPT_POSTFIELDS => $body,
        CURLOPT_TIMEOUT => 30,
    ]);
    $response = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    $error = curl_error($ch);
    curl_close($ch);
    if ($response === false) {
        aps_error('APS request failed: ' . $error, 502);
    }
    $json = json_decode($response, true);
    if ($status >= 400) {
        aps_error('APS request failed.', $status, ['details' => $json ?: $response]);
    }
    return is_array($json) ? $json : [];
}

function aps_fetch_token(array $config = []): array {
    $secrets = aps_load_secrets();
    if (empty($secrets['clientId']) || empty($secrets['clientSecret'])) {
        aps_error('Missing APS secrets. Add secrets/aps.local.json or APS_CLIENT_ID / APS_CLIENT_SECRET env vars.', 501);
    }
    $scopes = $config['scopes'] ?? ['data:read', 'viewables:read'];
    $body = http_build_query([
        'grant_type' => 'client_credentials',
        'scope' => implode(' ', $scopes),
    ]);
    return aps_http_json(
        'https://developer.api.autodesk.com/authentication/v2/token',
        'POST',
        [
            'Content-Type: application/x-www-form-urlencoded',
            'Authorization: Basic ' . base64_encode($secrets['clientId'] . ':' . $secrets['clientSecret']),
        ],
        $body
    );
}

function aps_urnify(string $id): string {
    return rtrim(strtr(base64_encode($id), '+/', '-_'), '=');
}

function aps_get_json(string $url, string $token): array {
    return aps_http_json($url, 'GET', [
        'Authorization: Bearer ' . $token,
        'Accept: application/json',
    ]);
}

function aps_collect_folder_models(string $projectId, string $folderId, string $token, string $prefix = '', int $depth = 0, int $maxDepth = 6): array {
    $contents = aps_get_json('https://developer.api.autodesk.com/data/v1/projects/' . rawurlencode($projectId) . '/folders/' . rawurlencode($folderId) . '/contents', $token);
    $items = $contents['data'] ?? [];
    $models = [];
    foreach ($items as $entry) {
        $type = $entry['type'] ?? '';
        $attributes = $entry['attributes'] ?? [];
        $name = $attributes['displayName'] ?? $attributes['name'] ?? 'Unnamed';
        if ($type === 'folders' && $depth < $maxDepth) {
            $childPrefix = trim($prefix . '/' . $name, '/');
            $models = array_merge($models, aps_collect_folder_models($projectId, $entry['id'], $token, $childPrefix, $depth + 1, $maxDepth));
            continue;
        }
        if ($type !== 'items') continue;
        $versions = aps_get_json('https://developer.api.autodesk.com/data/v1/projects/' . rawurlencode($projectId) . '/items/' . rawurlencode($entry['id']) . '/versions', $token);
        $latest = $versions['data'][0] ?? null;
        if (!$latest) continue;
        $versionName = $latest['attributes']['createTime'] ?? '';
        $models[] = [
            'id' => $entry['id'],
            'name' => $name,
            'folderPath' => trim($prefix, '/'),
            'versionId' => $latest['id'],
            'versionName' => $versionName,
            'urn' => aps_urnify($latest['id']),
            'type' => $type,
            'webUrl' => $latest['links']['webView']['href'] ?? '',
        ];
    }
    return $models;
}
