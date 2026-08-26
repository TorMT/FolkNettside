<?php
require __DIR__ . '/common.php';

$query = trim((string)($_GET['q'] ?? ''));
if (mb_strlen($query) < 2 || mb_strlen($query) > 80) matpris_json(['error' => 'Søket må være mellom 2 og 80 tegn.'], 400);
matpris_request('products', ['search' => $query, 'unique' => 'true', 'size' => '50'], 300);
