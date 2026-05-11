<?php
function brewing_repo_root(): string {
    return realpath(__DIR__ . '/../../../') ?: __DIR__;
}

function brewing_logs_root(): string {
    return brewing_repo_root()
        . DIRECTORY_SEPARATOR . 'diverse'
        . DIRECTORY_SEPARATOR . 'Brygging'
        . DIRECTORY_SEPARATOR . 'filer'
        . DIRECTORY_SEPARATOR . 'bryggelogger';
}

function brewing_recipes_root(): string {
    return brewing_repo_root()
        . DIRECTORY_SEPARATOR . 'diverse'
        . DIRECTORY_SEPARATOR . 'Brygging'
        . DIRECTORY_SEPARATOR . 'filer'
        . DIRECTORY_SEPARATOR . 'oppskrifter';
}

function brewing_cache_root(): string {
    return brewing_repo_root()
        . DIRECTORY_SEPARATOR . 'diverse'
        . DIRECTORY_SEPARATOR . 'Brygging'
        . DIRECTORY_SEPARATOR . 'filer'
        . DIRECTORY_SEPARATOR . 'cache';
}

function brewing_json_response($data, int $code = 200): void {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
    exit;
}

function brewing_error(string $message, int $code = 500, array $extra = []): void {
    brewing_json_response(array_merge(['error' => $message], $extra), $code);
}

function brewing_read_input_json(): array {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw ?: '', true);
    if (!is_array($data)) {
        brewing_error('Invalid JSON body.', 400);
    }
    return $data;
}

function brewing_read_json_file(string $path): array {
    if (!is_file($path)) {
        brewing_error('Missing file: ' . basename($path), 404);
    }
    $raw = file_get_contents($path);
    $data = json_decode($raw ?: '', true);
    if (!is_array($data)) {
        brewing_error('Invalid JSON in ' . basename($path), 500);
    }
    return $data;
}

function brewing_ensure_logs_root(): string {
    $root = brewing_logs_root();
    if (!is_dir($root) && !mkdir($root, 0775, true) && !is_dir($root)) {
        brewing_error('Could not create logs directory.', 500);
    }
    return $root;
}

function brewing_ensure_recipe_root(): string {
    $root = brewing_recipes_root();
    if (!is_dir($root) && !mkdir($root, 0775, true) && !is_dir($root)) {
        brewing_error('Could not create recipes directory.', 500);
    }
    return $root;
}

function brewing_ensure_cache_root(): string {
    $root = brewing_cache_root();
    if (!is_dir($root) && !mkdir($root, 0775, true) && !is_dir($root)) {
        brewing_error('Could not create cache directory.', 500);
    }
    return $root;
}

function brewing_escape_html(string $value): string {
    return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function brewing_normalize_separators(string $path): string {
    return str_replace('\\', '/', $path);
}

function brewing_slugify(string $value): string {
    $value = trim($value);
    if ($value === '') {
        return 'brygglogg';
    }

    if (function_exists('iconv')) {
        $ascii = @iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $value);
        if (is_string($ascii) && $ascii !== '') {
            $value = $ascii;
        }
    }

    $value = strtolower($value);
    $value = preg_replace('/[^a-z0-9]+/', '-', $value) ?: '';
    $value = trim($value, '-');
    return $value !== '' ? $value : 'brygglogg';
}

function brewing_safe_folder_name(string $value): string {
    $clean = trim(str_replace(["\0", '/', '\\', ':', '*', '?', '"', '<', '>', '|'], ' ', $value));
    $clean = preg_replace('/\s+/', ' ', $clean) ?: '';
    $clean = trim($clean, '. ');
    return $clean !== '' ? $clean : 'Brygglogg';
}

function brewing_normalize_recipe_ref($value): ?array {
    if (!is_array($value)) {
        return null;
    }

    $normalized = [
        'id' => trim((string)($value['id'] ?? '')),
        'slug' => trim((string)($value['slug'] ?? '')),
        'source' => trim((string)($value['source'] ?? '')),
        'providerLabel' => trim((string)($value['providerLabel'] ?? '')),
        'name' => trim((string)($value['name'] ?? '')),
        'style' => trim((string)($value['style'] ?? '')),
        'batchVolume' => $value['batchVolume'] ?? null,
    ];

    if ($normalized['id'] === '' && $normalized['name'] === '') {
        return null;
    }

    if ($normalized['slug'] === '') {
        $normalized['slug'] = $normalized['id'];
    }

    if ($normalized['source'] === '') {
        $normalized['source'] = 'local';
    }

    if ($normalized['providerLabel'] === '') {
        $normalized['providerLabel'] = $normalized['source'] === 'brewfather' ? 'Brewfather' : 'Lokal';
    }

    return $normalized;
}

function brewing_path_to_url(string $absolutePath): string {
    $root = brewing_normalize_separators(brewing_repo_root());
    $path = brewing_normalize_separators($absolutePath);
    if (strpos($path, $root) !== 0) {
        return '';
    }
    $relative = ltrim(substr($path, strlen($root)), '/');
    $segments = array_map('rawurlencode', explode('/', $relative));
    return '/' . implode('/', $segments);
}

function brewing_safe_join(string $baseDir, string $childDir): string {
    $baseReal = realpath($baseDir);
    if ($baseReal === false) {
        brewing_error('Base directory is unavailable.', 500);
    }

    $path = $baseReal . DIRECTORY_SEPARATOR . $childDir;
    $real = realpath($path);
    if ($real === false || strpos(brewing_normalize_separators($real), brewing_normalize_separators($baseReal)) !== 0) {
        brewing_error('Requested log folder is not available.', 404);
    }
    return $real;
}

function brewing_load_api_secrets(): array {
    $secretPath = brewing_repo_root() . DIRECTORY_SEPARATOR . 'secrets' . DIRECTORY_SEPARATOR . 'brewing-apis.local.json';
    $data = [];

    if (is_file($secretPath)) {
        $raw = file_get_contents($secretPath);
        $parsed = json_decode($raw ?: '', true);
        if (is_array($parsed)) {
            $data = $parsed;
        }
    }

    return [
        'catalogBeerApiKey' => trim((string)($data['catalogBeerApiKey'] ?? (getenv('CATALOG_BEER_API_KEY') ?: ''))),
        'brewfatherUserId' => trim((string)($data['brewfatherUserId'] ?? (getenv('BREWFATHER_USER_ID') ?: ''))),
        'brewfatherApiKey' => trim((string)($data['brewfatherApiKey'] ?? (getenv('BREWFATHER_API_KEY') ?: ''))),
        'googleDriveClientId' => trim((string)($data['googleDriveClientId'] ?? (getenv('GOOGLE_DRIVE_CLIENT_ID') ?: ''))),
        'googleDriveApiKey' => trim((string)($data['googleDriveApiKey'] ?? (getenv('GOOGLE_DRIVE_API_KEY') ?: ''))),
        'googleDriveProjectNumber' => trim((string)($data['googleDriveProjectNumber'] ?? (getenv('GOOGLE_DRIVE_PROJECT_NUMBER') ?: ''))),
        'googleDriveFolderId' => trim((string)($data['googleDriveFolderId'] ?? (getenv('GOOGLE_DRIVE_FOLDER_ID') ?: ''))),
        'googleDriveShareUrl' => trim((string)($data['googleDriveShareUrl'] ?? (getenv('GOOGLE_DRIVE_SHARE_URL') ?: ''))),
    ];
}

function brewing_public_google_drive_config(): array {
    $secrets = brewing_load_api_secrets();
    $storageConfig = brewing_read_storage_config();
    $folderId = trim((string)($storageConfig['googleDrive']['folderId'] ?? ''));
    if ($folderId === '') {
        $folderId = $secrets['googleDriveFolderId'];
    }
    $shareUrl = trim((string)($storageConfig['googleDrive']['shareUrl'] ?? ''));
    if ($shareUrl === '') {
        $shareUrl = $secrets['googleDriveShareUrl'];
    }

    return [
        'enabled' => $secrets['googleDriveClientId'] !== '' && $secrets['googleDriveProjectNumber'] !== '',
        'clientId' => $secrets['googleDriveClientId'],
        'projectNumber' => $secrets['googleDriveProjectNumber'],
        'scope' => 'https://www.googleapis.com/auth/drive.file',
        'folderId' => $folderId,
        'shareUrl' => $shareUrl,
    ];
}

function brewing_storage_mode_label(string $mode): string {
    if ($mode === 'google-drive') {
        return 'Google Drive';
    }
    if ($mode === 'hybrid') {
        return 'Hybrid';
    }
    return 'Lokal';
}

function brewing_storage_mode_summary(string $mode): string {
    if ($mode === 'google-drive') {
        return 'Bryggedata speiles lokalt for viewer-en, mens Google Drive er hovedstedet for deling, loggmapper og bilder.';
    }
    if ($mode === 'hybrid') {
        return 'Bryggedata lagres lokalt, og Google Drive kan brukes i tillegg for synk, loggmapper og bilder.';
    }
    return 'Bryggeloggen holdes lokalt på serveren sammen med eventuelle bilder.';
}

function brewing_normalize_storage_mode($value): string {
    $mode = trim((string)$value);
    return in_array($mode, ['local', 'hybrid', 'google-drive'], true) ? $mode : 'local';
}

function brewing_storage_config_path(): string {
    return brewing_ensure_logs_root() . DIRECTORY_SEPARATOR . '_storage.json';
}

function brewing_extract_google_drive_id(string $value): string {
    $trimmed = trim($value);
    if ($trimmed === '') {
        return '';
    }

    if (preg_match('~/folders/([a-zA-Z0-9_-]+)~', $trimmed, $matches)) {
        return $matches[1];
    }
    if (preg_match('~/d/([a-zA-Z0-9_-]+)~', $trimmed, $matches)) {
        return $matches[1];
    }
    if (preg_match('/[?&]id=([a-zA-Z0-9_-]+)/', $trimmed, $matches)) {
        return $matches[1];
    }
    if (preg_match('/^[a-zA-Z0-9_-]{10,}$/', $trimmed)) {
        return $trimmed;
    }
    return '';
}

function brewing_normalize_google_drive_settings($value, array $fallback = []): array {
    $input = is_array($value) ? $value : [];
    $shareUrl = trim((string)($input['shareUrl'] ?? ($input['folderUrl'] ?? ($fallback['shareUrl'] ?? ''))));
    $folderId = trim((string)($input['folderId'] ?? ''));
    if ($folderId === '') {
        $folderId = brewing_extract_google_drive_id($shareUrl);
    }
    if ($folderId === '') {
        $folderId = trim((string)($fallback['folderId'] ?? ''));
    }
    if ($shareUrl === '' && $folderId !== '') {
        $shareUrl = 'https://drive.google.com/drive/folders/' . $folderId;
    }

    return [
        'folderId' => $folderId,
        'shareUrl' => $shareUrl,
        'note' => trim((string)($input['note'] ?? ($fallback['note'] ?? ''))),
        'folderLabel' => trim((string)($input['folderLabel'] ?? ($fallback['folderLabel'] ?? 'FolkNettside'))),
        'lastSyncedAt' => trim((string)($input['lastSyncedAt'] ?? ($fallback['lastSyncedAt'] ?? ''))),
        'accountLabel' => trim((string)($input['accountLabel'] ?? ($fallback['accountLabel'] ?? ''))),
        'files' => is_array($input['files'] ?? null)
            ? array_values($input['files'])
            : (is_array($fallback['files'] ?? null) ? array_values($fallback['files']) : []),
    ];
}

function brewing_default_storage_config(): array {
    $secrets = brewing_load_api_secrets();
    return [
        'schemaVersion' => 1,
        'defaultMode' => 'local',
        'googleDrive' => brewing_normalize_google_drive_settings([
            'folderId' => $secrets['googleDriveFolderId'],
            'shareUrl' => $secrets['googleDriveShareUrl'],
            'folderLabel' => 'FolkNettside',
        ]),
    ];
}

function brewing_read_storage_config(): array {
    $defaults = brewing_default_storage_config();
    $path = brewing_storage_config_path();
    if (!is_file($path)) {
        return $defaults;
    }

    $raw = file_get_contents($path);
    $decoded = json_decode($raw ?: '', true);
    if (!is_array($decoded)) {
        return $defaults;
    }

    return [
        'schemaVersion' => 1,
        'defaultMode' => brewing_normalize_storage_mode($decoded['defaultMode'] ?? $defaults['defaultMode']),
        'googleDrive' => brewing_normalize_google_drive_settings($decoded['googleDrive'] ?? [], $defaults['googleDrive']),
    ];
}

function brewing_write_storage_config(array $config): array {
    $current = brewing_read_storage_config();
    $normalized = [
        'schemaVersion' => 1,
        'defaultMode' => brewing_normalize_storage_mode($config['defaultMode'] ?? $current['defaultMode']),
        'googleDrive' => brewing_normalize_google_drive_settings($config['googleDrive'] ?? [], $current['googleDrive']),
    ];

    $json = json_encode($normalized, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
    if (!is_string($json) || @file_put_contents(brewing_storage_config_path(), $json) === false) {
        brewing_error('Could not save storage configuration.', 500);
    }

    return $normalized;
}

function brewing_normalize_storage_payload($value, array $config = []): array {
    $storageConfig = !empty($config) ? $config : brewing_read_storage_config();
    $input = is_array($value) ? $value : [];
    $mode = brewing_normalize_storage_mode($input['mode'] ?? $input['storageMode'] ?? $storageConfig['defaultMode']);
    $googleDrive = brewing_normalize_google_drive_settings($input['googleDrive'] ?? [], $storageConfig['googleDrive'] ?? []);
    $localInput = is_array($input['local'] ?? null) ? $input['local'] : [];

    return [
        'mode' => $mode,
        'label' => brewing_storage_mode_label($mode),
        'summary' => brewing_storage_mode_summary($mode),
        'local' => [
            'metadataSaved' => true,
            'folderUrl' => trim((string)($localInput['folderUrl'] ?? '')),
            'mediaPreferred' => $mode === 'local',
        ],
        'googleDrive' => [
            'enabled' => $mode === 'hybrid' || $mode === 'google-drive',
            'preferred' => $mode === 'google-drive',
            'folderId' => $googleDrive['folderId'],
            'shareUrl' => $googleDrive['shareUrl'],
            'note' => $googleDrive['note'],
            'folderLabel' => $googleDrive['folderLabel'],
            'lastSyncedAt' => $googleDrive['lastSyncedAt'],
            'accountLabel' => $googleDrive['accountLabel'],
            'files' => $googleDrive['files'],
        ],
    ];
}

function brewing_attach_local_storage_url(array $storage, string $dir): array {
    $storage['local']['folderUrl'] = brewing_path_to_url($dir);
    return $storage;
}

function brewing_write_json_file(string $path, array $payload): void {
    $json = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
    if (!is_string($json) || @file_put_contents($path, $json) === false) {
        brewing_error('Could not write ' . basename($path) . '.', 500);
    }
}

function brewing_drive_manifest(array $log): array {
    $storage = is_array($log['storage'] ?? null) ? $log['storage'] : [];
    return [
        'schemaVersion' => 1,
        'batchName' => $log['batchName'] ?? null,
        'folderName' => $log['folderName'] ?? null,
        'exportedAt' => $log['exportedAt'] ?? null,
        'storage' => $storage,
        'files' => [
            'logg.json' => 'Hovedfil for bryggeloggen',
            'logg.html' => 'Portabel HTML-oppsummering',
            'telemetry.csv' => 'Filtrert hydrometerhistorikk',
            'bilder/' => 'Legg bryggebilder her eller bruk Google Drive-mappen.',
        ],
    ];
}

function brewing_example_drive_image_svg(array $log): string {
    $batchName = htmlspecialchars((string)($log['batchName'] ?? 'Brygg'), ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    $styleName = htmlspecialchars((string)($log['styleName'] ?? 'Brygging'), ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    $periodLabel = htmlspecialchars((string)($log['periodLabel'] ?? 'Fra valgt visning'), ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');

    return '<?xml version="1.0" encoding="UTF-8"?>'
        . '<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900" role="img" aria-labelledby="title desc">'
        . '<title id="title">Eksempelbilde for bryggeloggen</title>'
        . '<desc id="desc">Automatisk eksempelbilde for Google Drive-visning i Brygging.</desc>'
        . '<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#0f405c"/><stop offset="55%" stop-color="#2f79b8"/><stop offset="100%" stop-color="#7e36ff"/></linearGradient></defs>'
        . '<rect width="1600" height="900" rx="36" fill="url(#bg)"/>'
        . '<circle cx="1320" cy="180" r="120" fill="rgba(255,255,255,0.16)"/>'
        . '<circle cx="1440" cy="720" r="190" fill="rgba(255,255,255,0.08)"/>'
        . '<rect x="84" y="96" width="580" height="708" rx="32" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.22)"/>'
        . '<text x="128" y="190" font-family="Segoe UI, Arial, sans-serif" font-size="38" font-weight="700" fill="#ffffff">Brygging</text>'
        . '<text x="128" y="262" font-family="Segoe UI, Arial, sans-serif" font-size="68" font-weight="800" fill="#ffffff">' . $batchName . '</text>'
        . '<text x="128" y="326" font-family="Segoe UI, Arial, sans-serif" font-size="30" fill="rgba(255,255,255,0.86)">' . $styleName . '</text>'
        . '<text x="128" y="388" font-family="Segoe UI, Arial, sans-serif" font-size="24" fill="rgba(255,255,255,0.76)">Visning: ' . $periodLabel . '</text>'
        . '<text x="128" y="500" font-family="Segoe UI, Arial, sans-serif" font-size="28" fill="#ffffff">Dette er et automatisk eksempelbilde.</text>'
        . '<text x="128" y="548" font-family="Segoe UI, Arial, sans-serif" font-size="24" fill="rgba(255,255,255,0.82)">Legg egne bryggebilder i bilder-mappen i Google Drive,</text>'
        . '<text x="128" y="588" font-family="Segoe UI, Arial, sans-serif" font-size="24" fill="rgba(255,255,255,0.82)">sa vises de her sammen med loggen.</text>'
        . '<g transform="translate(820 190)">'
        . '<rect x="0" y="0" width="540" height="520" rx="34" fill="rgba(255,255,255,0.92)"/>'
        . '<path d="M86 370 L210 250 L310 330 L396 210 L486 370 Z" fill="#9c64ff" opacity="0.92"/>'
        . '<circle cx="414" cy="134" r="44" fill="#f7b94a"/>'
        . '<rect x="78" y="408" width="382" height="18" rx="9" fill="#d6e7f4"/>'
        . '<rect x="78" y="444" width="278" height="18" rx="9" fill="#d6e7f4"/>'
        . '</g>'
        . '</svg>';
}

function brewing_build_drive_sync_package(array $log): array {
    $html = brewing_render_log_html($log);
    $csv = brewing_csv_from_history((array)($log['history'] ?? []));
    $json = json_encode($log, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
    if (!is_string($json)) {
        $json = '{}';
    }

    $readme = "Denne mappen er eksportert fra Brygging-siden.\n\n"
        . "Legg egne bilder i mappen 'bilder' eller i rotmappen.\n"
        . "Viewer-en leser loggdata fra logg.json og viser alle bildefiler den finner i samme bryggemappe.\n"
        . "Lagringsmodus: " . ($log['storage']['label'] ?? 'Lokal') . "\n";
    $imageGuide = (!empty($log['storage']['googleDrive']['enabled']))
        ? "Denne bryggeloggen er koblet til Google Drive.\nLegg gjerne bildefiler i denne undermappen, så kan Brygging oppdatere dem videre.\n"
        : "Legg lokale bryggebilder i denne mappen for å vise dem direkte i Brygging.\n";
    $imageFiles = [
        [
            'name' => 'legg-bilder-her.txt',
            'mimeType' => 'text/plain',
            'content' => $imageGuide,
        ],
    ];
    if (!empty($log['storage']['googleDrive']['enabled'])) {
        $imageFiles[] = [
            'name' => 'eksempel-brygging.svg',
            'mimeType' => 'image/svg+xml',
            'content' => brewing_example_drive_image_svg($log),
        ];
    }

    return [
        'folderName' => (string)($log['folderName'] ?? 'Brygglogg'),
        'files' => [
            [
                'name' => 'logg.json',
                'mimeType' => 'application/json',
                'content' => $json,
            ],
            [
                'name' => 'logg.html',
                'mimeType' => 'text/html',
                'content' => $html,
            ],
            [
                'name' => 'telemetry.csv',
                'mimeType' => 'text/csv',
                'content' => $csv,
            ],
            [
                'name' => 'README.txt',
                'mimeType' => 'text/plain',
                'content' => $readme,
            ],
            [
                'name' => 'drive-manifest.json',
                'mimeType' => 'application/json',
                'content' => json_encode(brewing_drive_manifest($log), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT) ?: '{}',
            ],
            [
                'name' => 'google-drive-upload-guide.txt',
                'mimeType' => 'text/plain',
                'content' => brewing_drive_upload_readme($log),
            ],
        ],
        'subfolders' => [
            [
                'name' => 'bilder',
                'files' => $imageFiles,
            ],
        ],
    ];
}

function brewing_drive_upload_readme(array $log): string {
    $storage = is_array($log['storage'] ?? null) ? $log['storage'] : [];
    $shareUrl = trim((string)($storage['googleDrive']['shareUrl'] ?? ''));

    return "Google Drive-synk for Brygging\n\n"
        . "1. Koble Google-kontoen din i Brygging.\n"
        . "2. Velg lagringsmodus Hybrid eller Google Drive.\n"
        . "3. Lagre bryggeloggen fra Brygging-siden.\n"
        . "4. Brygging oppretter deretter mappen automatisk i Drive under FolkNettside/Brygging/<logg>.\n"
        . "5. Legg egne bilder i undermappen bilder hvis du vil at de skal vises sammen med loggen.\n\n"
        . ($shareUrl !== '' ? ("Standard Drive-mappe er satt til:\n" . $shareUrl . "\n\n") : '')
        . "Tips: behold logg.json, logg.html og telemetry.csv lokalt hvis du vil ha rask visning, og legg de tunge bildene i Drive.\n";
}

function brewing_log_date_key(array $log): string {
    $exportedAt = trim((string)($log['exportedAt'] ?? ''));
    if ($exportedAt !== '' && preg_match('/^\d{4}-\d{2}-\d{2}/', $exportedAt, $matches)) {
        return $matches[0];
    }
    return gmdate('Y-m-d');
}

function brewing_log_fingerprint(array $log): string {
    $history = array_values(is_array($log['history'] ?? null) ? $log['history'] : []);
    $firstRow = $history[0] ?? [];
    $lastRow = $history ? $history[count($history) - 1] : [];

    $payload = [
        'batchName' => (string)($log['batchName'] ?? ''),
        'deviceId' => (string)($log['deviceId'] ?? ''),
        'deviceName' => (string)($log['deviceName'] ?? ''),
        'profileName' => (string)($log['profileName'] ?? ''),
        'dateKey' => brewing_log_date_key($log),
        'historyCount' => count($history),
        'firstAt' => (string)($firstRow['createdOn'] ?? ''),
        'lastAt' => (string)($lastRow['createdOn'] ?? ''),
        'lastGravity' => (string)($lastRow['gravity'] ?? ''),
    ];

    return hash('sha256', json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?: '');
}

function brewing_resolve_log_dir(string $root, string $folderName, array $log): array {
    $baseDir = $root . DIRECTORY_SEPARATOR . $folderName;
    $fingerprint = brewing_log_fingerprint($log);

    if (!is_dir($baseDir)) {
        return [
            'dir' => $baseDir,
            'folderName' => $folderName,
            'fingerprint' => $fingerprint,
            'updatedExisting' => false,
        ];
    }

    $jsonPath = $baseDir . DIRECTORY_SEPARATOR . 'logg.json';
    if (is_file($jsonPath)) {
        $existing = brewing_read_json_file($jsonPath);
        $existingFingerprint = trim((string)($existing['logFingerprint'] ?? ''));
        if ($existingFingerprint !== '' && hash_equals($existingFingerprint, $fingerprint)) {
            return [
                'dir' => $baseDir,
                'folderName' => $folderName,
                'fingerprint' => $fingerprint,
                'updatedExisting' => true,
            ];
        }
    }

    for ($index = 2; $index <= 500; $index += 1) {
        $candidateName = $folderName . '_' . $index;
        $candidateDir = $root . DIRECTORY_SEPARATOR . $candidateName;
        if (!is_dir($candidateDir)) {
            return [
                'dir' => $candidateDir,
                'folderName' => $candidateName,
                'fingerprint' => $fingerprint,
                'updatedExisting' => false,
            ];
        }

        $candidateJson = $candidateDir . DIRECTORY_SEPARATOR . 'logg.json';
        if (is_file($candidateJson)) {
            $existing = brewing_read_json_file($candidateJson);
            $existingFingerprint = trim((string)($existing['logFingerprint'] ?? ''));
            if ($existingFingerprint !== '' && hash_equals($existingFingerprint, $fingerprint)) {
                return [
                    'dir' => $candidateDir,
                    'folderName' => $candidateName,
                    'fingerprint' => $fingerprint,
                    'updatedExisting' => true,
                ];
            }
        }
    }

    brewing_error('Could not find a safe log folder name without creating duplicates.', 500);
}

function brewing_persist_log_folder(array $log, string $html, string $csv, ?string $targetSlug = null): array {
    $root = brewing_ensure_logs_root();
    $existingLog = [];
    $safeTargetSlug = $targetSlug !== null ? brewing_safe_folder_name($targetSlug) : '';

    if ($safeTargetSlug !== '') {
        $dir = brewing_safe_join($root, basename($safeTargetSlug));
        if (!is_dir($dir)) {
            brewing_error('Selected brew log folder could not be found for update.', 404);
        }
        $jsonPath = $dir . DIRECTORY_SEPARATOR . 'logg.json';
        if (is_file($jsonPath)) {
            $existingLog = brewing_read_json_file($jsonPath);
        }
        $log['folderName'] = basename($safeTargetSlug);
        $log['logFingerprint'] = brewing_log_fingerprint($log);
        $log['updatedExisting'] = true;
    } else {
        $folderName = brewing_safe_folder_name((string)($log['folderName'] ?? 'Brygglogg'));
        $resolved = brewing_resolve_log_dir($root, $folderName, $log);
        $dir = $resolved['dir'];
        $log['folderName'] = $resolved['folderName'];
        $log['logFingerprint'] = $resolved['fingerprint'];
        $log['updatedExisting'] = (bool)$resolved['updatedExisting'];
        if (!empty($resolved['updatedExisting'])) {
            $jsonPath = $dir . DIRECTORY_SEPARATOR . 'logg.json';
            if (is_file($jsonPath)) {
                $existingLog = brewing_read_json_file($jsonPath);
            }
        }
    }

    if (!is_dir($dir) && !mkdir($dir, 0775, true) && !is_dir($dir)) {
        brewing_error('Could not create brew log folder.', 500);
    }

    if (($log['recipeRef'] ?? null) === null && !empty($existingLog['recipeRef'])) {
        $log['recipeRef'] = brewing_normalize_recipe_ref($existingLog['recipeRef']);
    }
    if (empty($log['styleName']) && !empty($existingLog['styleName'])) {
        $log['styleName'] = $existingLog['styleName'];
    }
    if (empty($log['deviceId']) && !empty($existingLog['deviceId'])) {
        $log['deviceId'] = $existingLog['deviceId'];
        $log['deviceName'] = $log['deviceName'] ?: ($existingLog['deviceName'] ?? null);
        $log['profileName'] = $log['profileName'] ?: ($existingLog['profileName'] ?? null);
    }
    $log['createdAt'] = trim((string)($log['createdAt'] ?? ($existingLog['createdAt'] ?? ($log['exportedAt'] ?? gmdate(DATE_ATOM)))));
    $log['updatedAt'] = gmdate(DATE_ATOM);
    $log['logMode'] = (!empty($log['history']) || !empty($log['deviceId'])) ? 'hydrometer' : 'draft';

    $storage = brewing_normalize_storage_payload($log['storage'] ?? null);
    $storage = brewing_attach_local_storage_url($storage, $dir);
    $log['storage'] = $storage;
    $html = brewing_render_log_html($log);

    brewing_write_json_file($dir . DIRECTORY_SEPARATOR . 'logg.json', $log);
    if (@file_put_contents($dir . DIRECTORY_SEPARATOR . 'logg.html', $html) === false) {
        brewing_error('Could not write logg.html.', 500);
    }
    if (@file_put_contents($dir . DIRECTORY_SEPARATOR . 'telemetry.csv', $csv) === false) {
        brewing_error('Could not write telemetry.csv.', 500);
    }

    $readme = "Denne mappen er eksportert fra Brygging-siden.\n\n"
        . "Loggdata leses fra logg.json.\n"
        . "telemetry.csv inneholder det samme filtrerte datasettet som ble vist ved eksport.\n";
    if (@file_put_contents($dir . DIRECTORY_SEPARATOR . 'README.txt', $readme) === false) {
        brewing_error('Could not write README.txt.', 500);
    }

    $imageDir = $dir . DIRECTORY_SEPARATOR . 'bilder';
    if (!is_dir($imageDir) && !mkdir($imageDir, 0775, true) && !is_dir($imageDir)) {
        brewing_error('Could not create bilder directory.', 500);
    }

    $imageGuide = $storage['googleDrive']['enabled']
        ? "Denne bryggeloggen er satt opp med Google Drive-støtte.\nLegg gjerne bilder i Google Drive-mappen, eller bruk denne lokale mappen hvis du vil ha alt samlet.\n"
        : "Legg lokale bryggebilder i denne mappen for å vise dem direkte i Brygging.\n";
    @file_put_contents($imageDir . DIRECTORY_SEPARATOR . 'legg-bilder-her.txt', $imageGuide);

    brewing_write_json_file($dir . DIRECTORY_SEPARATOR . 'drive-manifest.json', brewing_drive_manifest($log));
    @file_put_contents($dir . DIRECTORY_SEPARATOR . 'google-drive-upload-guide.txt', brewing_drive_upload_readme($log));

    return $log;
}

function brewing_basic_auth_header(string $username, string $password = ''): string {
    return 'Authorization: Basic ' . base64_encode($username . ':' . $password);
}

function brewing_http_json(string $url, array $headers = [], string $method = 'GET', ?string $body = null): array {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_POSTFIELDS => $body,
        CURLOPT_TIMEOUT => 20,
    ]);
    $response = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    $error = curl_error($ch);
    curl_close($ch);

    if ($response === false) {
        return [
            '_error' => 'NETWORK',
            '_status' => 0,
            '_raw' => $error,
        ];
    }

    $decoded = json_decode($response, true);
    if ($status >= 400) {
        return [
            '_error' => 'HTTP ' . $status,
            '_status' => $status,
            '_raw' => $decoded ?: $response,
        ];
    }

    return is_array($decoded) ? $decoded : [];
}

function brewing_http_text(string $url, array $headers = [], string $method = 'GET', ?string $body = null): array {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_POSTFIELDS => $body,
        CURLOPT_TIMEOUT => 20,
    ]);
    $response = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    $error = curl_error($ch);
    curl_close($ch);

    if ($response === false) {
        return [
            'ok' => false,
            'status' => 0,
            'body' => '',
            'error' => $error,
        ];
    }

    return [
        'ok' => $status >= 200 && $status < 400,
        'status' => $status,
        'body' => is_string($response) ? $response : '',
        'error' => $status >= 400 ? ('HTTP ' . $status) : null,
    ];
}

function brewing_read_cache_file(string $filename, int $maxAgeSeconds): ?array {
    $path = brewing_ensure_cache_root() . DIRECTORY_SEPARATOR . $filename;
    if (!is_file($path)) {
        return null;
    }

    $age = time() - (int)@filemtime($path);
    if ($age < 0 || $age > $maxAgeSeconds) {
        return null;
    }

    $raw = file_get_contents($path);
    $decoded = json_decode($raw ?: '', true);
    return is_array($decoded) ? $decoded : null;
}

function brewing_write_cache_file(string $filename, array $payload): void {
    $path = brewing_ensure_cache_root() . DIRECTORY_SEPARATOR . $filename;
    $json = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
    if (!is_string($json)) {
        return;
    }
    @file_put_contents($path, $json);
}

function brewing_csv_from_history(array $history): string {
    $stream = fopen('php://temp', 'r+');
    if ($stream === false) {
        return '';
    }

    fputcsv($stream, ['createdOn', 'gravity', 'temperature', 'gravityVelocity', 'battery', 'rssi']);
    foreach ($history as $row) {
        fputcsv($stream, [
            $row['createdOn'] ?? '',
            $row['gravity'] ?? '',
            $row['temperature'] ?? '',
            $row['gravityVelocity'] ?? '',
            $row['battery'] ?? '',
            $row['rssi'] ?? '',
        ]);
    }

    rewind($stream);
    $csv = stream_get_contents($stream);
    fclose($stream);
    return is_string($csv) ? $csv : '';
}

function brewing_find_log_json(string $dir): ?string {
    $candidate = $dir . DIRECTORY_SEPARATOR . 'logg.json';
    return is_file($candidate) ? $candidate : null;
}

function brewing_list_image_files(string $dir): array {
    $images = [];
    if (!is_dir($dir)) return $images;

    $allowed = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'avif'];
    $iterator = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($dir, FilesystemIterator::SKIP_DOTS)
    );

    foreach ($iterator as $file) {
        if (!$file->isFile()) continue;
        $ext = strtolower($file->getExtension());
        if (!in_array($ext, $allowed, true)) continue;
        $absolute = $file->getPathname();
        $images[] = [
            'name' => $file->getFilename(),
            'url' => brewing_path_to_url($absolute),
            'size' => $file->getSize(),
        ];
    }

    usort($images, static function ($a, $b) {
        return strnatcasecmp((string)$a['name'], (string)$b['name']);
    });

    return $images;
}

function brewing_is_image_file_name(string $name): bool {
    return (bool)preg_match('/\.(avif|bmp|gif|jpe?g|png|svg|webp)$/i', $name);
}

function brewing_drive_image_files(array $storage): array {
    $drive = is_array($storage['googleDrive'] ?? null) ? $storage['googleDrive'] : [];
    $files = is_array($drive['files'] ?? null) ? $drive['files'] : [];
    $images = [];

    foreach ($files as $file) {
        if (!is_array($file)) {
            continue;
        }
        $mimeType = strtolower((string)($file['mimeType'] ?? ''));
        $name = (string)($file['name'] ?? '');
        if ($mimeType !== '' && strpos($mimeType, 'image/') === 0) {
            $images[] = $file;
            continue;
        }
        if (brewing_is_image_file_name($name)) {
            $images[] = $file;
        }
    }

    return $images;
}

function brewing_collect_log_folders(): array {
    $root = brewing_ensure_logs_root();
    $entries = [];
    $dirItems = @scandir($root);
    if (!is_array($dirItems)) return $entries;

    foreach ($dirItems as $item) {
        if ($item === '.' || $item === '..') continue;
        $full = $root . DIRECTORY_SEPARATOR . $item;
        if (!is_dir($full)) continue;

        $jsonPath = brewing_find_log_json($full);
        $log = $jsonPath ? brewing_read_json_file($jsonPath) : [];
        $images = brewing_list_image_files($full);
        $recipeRef = brewing_normalize_recipe_ref($log['recipeRef'] ?? null);
        $storage = brewing_attach_local_storage_url(
            brewing_normalize_storage_payload($log['storage'] ?? null),
            $full
        );
        $driveImages = brewing_drive_image_files($storage);
        $entries[] = [
            'slug' => basename($full),
            'folderName' => $log['folderName'] ?? basename($full),
            'batchName' => $log['batchName'] ?? basename($full),
            'exportedAt' => $log['exportedAt'] ?? null,
            'styleName' => $log['styleName'] ?? null,
            'deviceName' => $log['deviceName'] ?? null,
            'recipeRef' => $recipeRef,
            'imageCount' => count($images) + count($driveImages),
            'coverImage' => $images[0]['url'] ?? null,
            'summary' => $log['summary'] ?? [],
            'metrics' => $log['metrics'] ?? [],
            'storage' => $storage,
            'folderUrl' => brewing_path_to_url($full),
        ];
    }

    usort($entries, static function ($a, $b) {
        return strcmp((string)($b['exportedAt'] ?? ''), (string)($a['exportedAt'] ?? ''));
    });

    return $entries;
}

function brewing_render_log_html(array $log): string {
    $batchName = brewing_escape_html((string)($log['batchName'] ?? 'Brygglogg'));
    $folderName = brewing_escape_html((string)($log['folderName'] ?? 'Brygglogg'));
    $styleName = brewing_escape_html((string)($log['styleName'] ?? 'Ukjent stil'));
    $exportedAt = brewing_escape_html((string)($log['exportedAt'] ?? ''));
    $summary = is_array($log['summary'] ?? null) ? $log['summary'] : [];
    $metrics = is_array($log['metrics'] ?? null) ? $log['metrics'] : [];
    $alerts = is_array($log['alerts'] ?? null) ? $log['alerts'] : [];
    $history = is_array($log['history'] ?? null) ? $log['history'] : [];
    $recipeRef = brewing_normalize_recipe_ref($log['recipeRef'] ?? null);
    $storage = brewing_normalize_storage_payload($log['storage'] ?? null);

    $metricCards = '';
    foreach ($metrics as $label => $value) {
        $metricCards .= '<article class="metric"><strong>' . brewing_escape_html((string)$label) . '</strong><span>' . brewing_escape_html((string)$value) . '</span></article>';
    }

    $summaryHtml = '';
    foreach ($summary as $label => $value) {
        $summaryHtml .= '<p><span class="label">' . brewing_escape_html((string)$label) . '</span>' . brewing_escape_html((string)$value) . '</p>';
    }

    $recipeHtml = '<p>Ingen oppskrift er knyttet til denne bryggeloggen ennå.</p>';
    if ($recipeRef !== null) {
        $recipeHtml = '<p><span class="label">Oppskrift</span>' . brewing_escape_html((string)($recipeRef['name'] ?? 'Oppskrift')) . '</p>'
            . '<p><span class="label">Kilde</span>' . brewing_escape_html((string)($recipeRef['providerLabel'] ?? 'Lokal')) . '</p>'
            . '<p><span class="label">Stil</span>' . brewing_escape_html((string)($recipeRef['style'] ?? '')) . '</p>';
    }
    $storageHtml = '<p><span class="label">Lagringsmodus</span>' . brewing_escape_html((string)($storage['label'] ?? 'Lokal')) . '</p>'
        . '<p>' . brewing_escape_html((string)($storage['summary'] ?? '')) . '</p>';
    if (!empty($storage['googleDrive']['shareUrl'])) {
        $storageHtml .= '<p><span class="label">Google Drive</span><a href="' . brewing_escape_html((string)$storage['googleDrive']['shareUrl']) . '">' . brewing_escape_html((string)$storage['googleDrive']['shareUrl']) . '</a></p>';
    }

    $alertsHtml = '';
    if (!empty($alerts)) {
        foreach ($alerts as $alert) {
            $alertsHtml .= '<article class="alert">'
                . '<strong>' . brewing_escape_html((string)($alert['title'] ?? 'Varsel')) . '</strong>'
                . '<p>' . brewing_escape_html((string)($alert['summary'] ?? '')) . '</p>'
                . '<p><span class="label">Tiltak</span>' . brewing_escape_html((string)($alert['actionSummary'] ?? '')) . '</p>'
                . '</article>';
        }
    } else {
        $alertsHtml = '<p>Ingen varsler var lagret i denne eksporten.</p>';
    }

    $historyHtml = '';
    foreach (array_slice($history, 0, 10) as $row) {
        $historyHtml .= '<tr>'
            . '<td>' . brewing_escape_html((string)($row['createdOn'] ?? '')) . '</td>'
            . '<td>' . brewing_escape_html((string)($row['gravity'] ?? '')) . '</td>'
            . '<td>' . brewing_escape_html((string)($row['temperature'] ?? '')) . '</td>'
            . '<td>' . brewing_escape_html((string)($row['battery'] ?? '')) . '</td>'
            . '</tr>';
    }

    return '<!DOCTYPE html>
<html lang="no">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>' . $folderName . '</title>
  <style>
    body{font-family:Segoe UI,Arial,sans-serif;margin:0;background:#eef5f8;color:#173344}
    main{max-width:1200px;margin:0 auto;padding:24px}
    .hero,.panel{background:#fff;border:1px solid rgba(23,51,68,.12);border-radius:24px;box-shadow:0 12px 30px rgba(17,44,58,.10)}
    .hero{padding:24px}
    .hero p{color:#567082;line-height:1.6}
    .metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-top:16px}
    .metric{padding:16px;border-radius:18px;background:linear-gradient(180deg,#fff,#f6fbfd);border:1px solid rgba(23,51,68,.12)}
    .metric strong,.metric span{display:block}
    .metric strong{font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#567082}
    .metric span{margin-top:4px;font-size:22px;font-weight:800}
    .layout{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(280px,.85fr);gap:16px;margin-top:16px}
    .panel{padding:20px}
    .label{display:inline-block;min-width:8rem;font-weight:700;color:#173344}
    .alert{padding:14px 16px;border-radius:16px;background:#fff7ea;border:1px solid rgba(217,124,43,.2);margin-top:12px}
    table{width:100%;border-collapse:collapse;margin-top:10px;font-size:14px}
    th,td{text-align:left;padding:8px;border-bottom:1px solid rgba(23,51,68,.08)}
    @media (max-width:900px){.layout{grid-template-columns:1fr}}
  </style>
</head>
<body>
  <main>
    <section class="hero">
      <p>Eksportert bryggelogg</p>
      <h1>' . $batchName . '</h1>
      <p>Mappe: ' . $folderName . '<br>Stil: ' . $styleName . '<br>Eksportert: ' . $exportedAt . ($recipeRef !== null ? '<br>Oppskrift: ' . brewing_escape_html((string)($recipeRef['name'] ?? 'Oppskrift')) : '') . '</p>
      <section class="metrics">' . $metricCards . '</section>
    </section>
    <section class="layout">
      <section class="panel">
        <h2>Gjæringslogg</h2>
        ' . $summaryHtml . '
      </section>
      <section class="panel">
        <h2>Koblet oppskrift</h2>
        ' . $recipeHtml . '
      </section>
    </section>
    <section class="layout">
      <section class="panel">
        <h2>Varsler</h2>
        ' . $alertsHtml . '
      </section>
      <section class="panel">
      <h2>Lagring</h2>
      ' . $storageHtml . '
    </section>
    </section>
    <section class="layout">
      <section class="panel">
      <h2>Første datapunkter</h2>
      <table>
        <thead><tr><th>Tid</th><th>Gravity</th><th>Temperatur</th><th>Batteri</th></tr></thead>
        <tbody>' . $historyHtml . '</tbody>
      </table>
    </section>
    <section class="panel">
      <h2>Om denne eksporten</h2>
      <p>Hvis du vil flytte bilder ut av serveren, kan du laste opp hele mappen til Google Drive og beholde denne lokale metadata-kopien for rask visning i Brygging.</p>
    </section>
    </section>
  </main>
</body>
</html>';
}
