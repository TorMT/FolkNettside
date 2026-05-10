<?php
require __DIR__ . '/providers.php';

$query = trim((string)($_GET['q'] ?? ''));

$references = [];
if ($query !== '') {
    $references = array_merge(
        brewing_fetch_openbrewery_references($query),
        brewing_fetch_catalog_references($query)
    );
}

brewing_json_response([
    'providers' => brewing_provider_statuses(),
    'query' => $query,
    'count' => count($references),
    'references' => $references,
]);
