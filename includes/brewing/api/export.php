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

$log = [
    'schemaVersion' => 2,
    'batchName' => $batchName,
    'folderName' => $folderName,
    'styleName' => $input['styleName'] ?? null,
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
];

$json = json_encode($log, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
if (!is_string($json)) {
    brewing_error('Could not encode brew log.', 500);
}

$html = brewing_render_log_html($log);
$csv = brewing_csv_from_history((array)$log['history']);
$readme = "Denne mappen er eksportert fra Brygging-siden.\n\n"
    . "Legg egne bilder i mappen 'bilder' eller i rotmappen.\n"
    . "Viewer-en leser loggdata fra logg.json og viser alle bildefiler den finner i samme bryggemappe.\n";

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
    $zip->close();
    @unlink($tmpFile);

    header('Content-Type: application/zip');
    header('Content-Disposition: attachment; filename="' . $safeZipBase . '.zip"');
    header('Content-Length: ' . filesize($zipPath));
    readfile($zipPath);
    @unlink($zipPath);
    exit;
}

header('Content-Type: text/html; charset=utf-8');
header('Content-Disposition: attachment; filename="' . $safeZipBase . '-logg.html"');
echo $html;
exit;
