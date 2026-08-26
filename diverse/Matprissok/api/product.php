<?php
require __DIR__ . '/common.php';

$ean = preg_replace('/\D+/', '', (string)($_GET['ean'] ?? ''));
if ($ean === '' || strlen($ean) < 8 || strlen($ean) > 14) matpris_json(['error' => 'Ugyldig EAN.'], 400);
matpris_request('products/ean/' . rawurlencode($ean), [], 900);
