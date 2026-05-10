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
    ];
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
        $entries[] = [
            'slug' => basename($full),
            'folderName' => $log['folderName'] ?? basename($full),
            'batchName' => $log['batchName'] ?? basename($full),
            'exportedAt' => $log['exportedAt'] ?? null,
            'styleName' => $log['styleName'] ?? null,
            'deviceName' => $log['deviceName'] ?? null,
            'recipeRef' => $recipeRef,
            'imageCount' => count($images),
            'coverImage' => $images[0]['url'] ?? null,
            'summary' => $log['summary'] ?? [],
            'metrics' => $log['metrics'] ?? [],
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
      <h2>Første datapunkter</h2>
      <table>
        <thead><tr><th>Tid</th><th>Gravity</th><th>Temperatur</th><th>Batteri</th></tr></thead>
        <tbody>' . $historyHtml . '</tbody>
      </table>
    </section>
    </section>
  </main>
</body>
</html>';
}
