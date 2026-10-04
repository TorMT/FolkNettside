<?php
require __DIR__ . '/common.php';

if (strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    brewing_error('POST required.', 405);
}

$input = brewing_read_input_json();
$batchName = brewing_safe_folder_name((string)($input['batchName'] ?? 'Brygglogg'));
$folderName = brewing_safe_folder_name((string)($input['folderName'] ?? $batchName));
$exportedAt = trim((string)($input['exportedAt'] ?? ''));
$recipeRef = brewing_normalize_recipe_ref($input['recipeRef'] ?? null);
$storageConfig = brewing_read_storage_config();
$storage = brewing_normalize_storage_payload($input['storage'] ?? null, $storageConfig);

$log = [
    'schemaVersion' => 2,
    'batchName' => $batchName,
    'folderName' => $folderName,
    'styleName' => $input['styleName'] ?? null,
    'deviceId' => $input['deviceId'] ?? null,
    'deviceName' => $input['deviceName'] ?? null,
    'profileName' => $input['profileName'] ?? null,
    'periodLabel' => $input['periodLabel'] ?? null,
    'recipeRef' => $recipeRef,
    'exportedAt' => $exportedAt !== '' ? $exportedAt : gmdate(DATE_ATOM),
    'summary' => is_array($input['summary'] ?? null) ? $input['summary'] : [],
    'metrics' => is_array($input['metrics'] ?? null) ? $input['metrics'] : [],
    'alerts' => is_array($input['alerts'] ?? null) ? $input['alerts'] : [],
    'history' => is_array($input['history'] ?? null) ? $input['history'] : [],
    'source' => is_array($input['source'] ?? null) ? $input['source'] : [],
    'storage' => $storage,
];

$json = json_encode($log, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
if (!is_string($json)) {
    brewing_error('Could not encode brew log.', 500);
}

$html = brewing_render_log_html($log);
$csv = brewing_csv_from_history((array)$log['history']);
$log = brewing_persist_log_folder($log, $html, $csv);
$html = brewing_render_log_html($log);
$json = json_encode($log, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
if (!is_string($json)) {
    brewing_error('Could not encode persisted brew log.', 500);
}
$readme = "Denne mappen er eksportert fra Brygging-siden.\n\n"
    . "Legg egne bilder i mappen 'bilder' eller i rotmappen.\n"
    . "Viewer-en leser loggdata fra logg.json og viser alle bildefiler den finner i samme bryggemappe.\n"
    . "Lagringsmodus: " . ($log['storage']['label'] ?? 'Lokal') . "\n";
$driveManifest = json_encode(brewing_drive_manifest($log), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);

$safeZipBase = brewing_slugify($folderName);

if (class_exists('ZipArchive')) {
    $tmpFile = tempnam(sys_get_temp_dir(), 'brewlog_');
    if ($tmpFile === false) {
        brewing_error('Could not allocate a temporary file for export.', 500);
    }

    $zipPath = $tmpFile . '.zip';
    @unlink($zipPath);

    $zip = new ZipArchive();
    if ($zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
        @unlink($tmpFile);
        brewing_error('Could not create ZIP export.', 500);
    }

    $zip->addFromString($folderName . '/logg.json', $json);
    $zip->addFromString($folderName . '/logg.html', $html);
    $zip->addFromString($folderName . '/telemetry.csv', $csv);
    $zip->addFromString($folderName . '/README.txt', $readme);
    $zip->addFromString($folderName . '/bilder/legg-bilder-her.txt', "Legg bilder for brygget i denne mappen.\n");
    if (is_string($driveManifest)) {
        $zip->addFromString($folderName . '/drive-manifest.json', $driveManifest);
    }
    $zip->addFromString($folderName . '/google-drive-upload-guide.txt', brewing_drive_upload_readme($log));
    $zip->close();
    @unlink($tmpFile);

    header('Content-Type: application/zip');
    header('Content-Disposition: attachment; filename="' . $safeZipBase . '.zip"');
    header('X-Brew-Log-Slug: ' . rawurlencode((string)($log['folderName'] ?? $folderName)));
    header('X-Brew-Log-Updated-Existing: ' . (!empty($log['updatedExisting']) ? '1' : '0'));
    header('Content-Length: ' . filesize($zipPath));
    readfile($zipPath);
    @unlink($zipPath);
    exit;
}

header('Content-Type: text/html; charset=utf-8');
header('Content-Disposition: attachment; filename="' . $safeZipBase . '-logg.html"');
header('X-Brew-Log-Slug: ' . rawurlencode((string)($log['folderName'] ?? $folderName)));
header('X-Brew-Log-Updated-Existing: ' . (!empty($log['updatedExisting']) ? '1' : '0'));
echo $html;
exit;
