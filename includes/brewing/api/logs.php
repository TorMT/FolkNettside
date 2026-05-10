<?php
require __DIR__ . '/common.php';

$root = brewing_ensure_logs_root();
$slug = trim((string)($_GET['slug'] ?? ''));

if ($slug === '') {
    brewing_json_response([
        'root' => brewing_path_to_url($root),
        'logs' => brewing_collect_log_folders(),
    ]);
}

$dir = brewing_safe_join($root, basename($slug));
$jsonPath = brewing_find_log_json($dir);
if ($jsonPath === null) {
    brewing_error('Missing logg.json in the selected brew log folder.', 404);
}

$log = brewing_read_json_file($jsonPath);
brewing_json_response([
    'log' => $log,
    'images' => brewing_list_image_files($dir),
    'folderUrl' => brewing_path_to_url($dir),
]);
