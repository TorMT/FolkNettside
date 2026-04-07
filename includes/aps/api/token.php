<?php
require __DIR__ . '/common.php';
$config = aps_read_json_file(aps_resolve_config_path($_GET['config'] ?? ''));
$token = aps_fetch_token($config);
aps_json_response(['access_token' => $token['access_token'] ?? '', 'expires_in' => $token['expires_in'] ?? 3599]);
