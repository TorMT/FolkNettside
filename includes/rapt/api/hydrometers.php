<?php
require __DIR__ . '/common.php';

$secrets = rapt_load_secrets();
$username = rapt_resolve_username($secrets);
$token = rapt_fetch_token($username);
$items = rapt_get_json('https://api.rapt.io/api/Hydrometers/GetHydrometers', $token['access_token'] ?? '');

rapt_json_response([
    'username' => $username,
    'count' => is_array($items) ? count($items) : 0,
    'items' => is_array($items) ? $items : [],
]);
