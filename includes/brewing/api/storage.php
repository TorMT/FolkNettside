<?php
require __DIR__ . '/providers.php';

$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');

if ($method === 'GET') {
    brewing_json_response([
        'config' => brewing_read_storage_config(),
        'storageOptions' => brewing_storage_recommendations(),
        'googleDriveAuth' => brewing_public_google_drive_config(),
    ]);
}

if ($method !== 'POST') {
    brewing_error('GET or POST required.', 405);
}

$input = brewing_read_input_json();
$action = trim((string)($input['action'] ?? ''));

if ($action === 'save-config') {
    $config = brewing_write_storage_config([
        'defaultMode' => $input['defaultMode'] ?? null,
        'googleDrive' => $input['googleDrive'] ?? [],
    ]);

    brewing_json_response([
        'saved' => true,
        'config' => $config,
        'storageOptions' => brewing_storage_recommendations(),
        'googleDriveAuth' => brewing_public_google_drive_config(),
    ]);
}

if ($action === 'save-log-storage') {
    $slug = trim((string)($input['slug'] ?? ''));
    if ($slug === '') {
        brewing_error('Missing slug for log storage update.', 400);
    }

    $root = brewing_ensure_logs_root();
    $dir = brewing_safe_join($root, basename($slug));
    $jsonPath = brewing_find_log_json($dir);
    if ($jsonPath === null) {
        brewing_error('Missing logg.json in selected brew log folder.', 404);
    }

    $log = brewing_read_json_file($jsonPath);
    $storage = brewing_attach_local_storage_url(
        brewing_normalize_storage_payload($input['storage'] ?? null),
        $dir
    );
    $log['storage'] = $storage;
    $log['updatedAt'] = gmdate(DATE_ATOM);
    brewing_write_json_file($jsonPath, $log);
    @file_put_contents($dir . DIRECTORY_SEPARATOR . 'logg.html', brewing_render_log_html($log));
    @file_put_contents($dir . DIRECTORY_SEPARATOR . 'telemetry.csv', brewing_csv_from_history((array)($log['history'] ?? [])));
    brewing_write_json_file($dir . DIRECTORY_SEPARATOR . 'drive-manifest.json', brewing_drive_manifest($log));
    @file_put_contents($dir . DIRECTORY_SEPARATOR . 'google-drive-upload-guide.txt', brewing_drive_upload_readme($log));

    brewing_json_response([
        'saved' => true,
        'log' => $log,
        'folderUrl' => brewing_path_to_url($dir),
        'storageOptions' => brewing_storage_recommendations(),
        'storageConfig' => brewing_read_storage_config(),
        'googleDriveAuth' => brewing_public_google_drive_config(),
    ]);
}

if ($action === 'prepare-drive-sync') {
    $slug = trim((string)($input['slug'] ?? ''));
    if ($slug === '') {
        brewing_error('Missing slug for Drive sync package.', 400);
    }

    $root = brewing_ensure_logs_root();
    $dir = brewing_safe_join($root, basename($slug));
    $jsonPath = brewing_find_log_json($dir);
    if ($jsonPath === null) {
        brewing_error('Missing logg.json in selected brew log folder.', 404);
    }

    $log = brewing_read_json_file($jsonPath);
    $log['storage'] = brewing_attach_local_storage_url(
        brewing_normalize_storage_payload($log['storage'] ?? null),
        $dir
    );

    brewing_json_response([
        'slug' => basename($dir),
        'folderUrl' => brewing_path_to_url($dir),
        'log' => $log,
        'images' => brewing_list_image_files($dir),
        'package' => brewing_build_drive_sync_package($log),
        'storageConfig' => brewing_read_storage_config(),
        'storageOptions' => brewing_storage_recommendations(),
        'googleDriveAuth' => brewing_public_google_drive_config(),
    ]);
}

brewing_error('Unknown storage action.', 400);
