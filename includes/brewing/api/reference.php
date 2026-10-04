<?php
require __DIR__ . '/providers.php';

$query = trim((string)($_GET['q'] ?? ''));

$references = [];
if ($query !== '') {
    $references = array_merge(
        brewing_fetch_olbrygging_references($query),
        brewing_fetch_hopdatabase_references($query),
        brewing_fetch_openbrewery_references($query),
        brewing_fetch_catalog_references($query),
        brewing_fetch_punk_references($query),
        brewing_fetch_tapline_references($query)
    );
}

brewing_json_response([
    'providers' => brewing_provider_statuses(),
    'storageOptions' => brewing_storage_recommendations(),
    'query' => $query,
    'count' => count($references),
    'references' => $references,
]);
