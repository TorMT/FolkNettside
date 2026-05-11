<?php
require __DIR__ . '/providers.php';

$root = brewing_ensure_logs_root();
$slug = trim((string)($_GET['slug'] ?? ''));

if ($slug === '') {
    brewing_json_response([
        'root' => brewing_path_to_url($root),
        'logs' => brewing_collect_log_folders(),
        'storageConfig' => brewing_read_storage_config(),
        'storageOptions' => brewing_storage_recommendations(),
    ]);
}

$dir = brewing_safe_join($root, basename($slug));
$jsonPath = brewing_find_log_json($dir);
if ($jsonPath === null) {
    brewing_error('Missing logg.json in the selected brew log folder.', 404);
}

$log = brewing_read_json_file($jsonPath);
$log['storage'] = brewing_attach_local_storage_url(
    brewing_normalize_storage_payload($log['storage'] ?? null),
    $dir
);
brewing_json_response([
    'log' => $log,
    'images' => brewing_list_image_files($dir),
    'folderUrl' => brewing_path_to_url($dir),
    'storageConfig' => brewing_read_storage_config(),
    'storageOptions' => brewing_storage_recommendations(),
]);
