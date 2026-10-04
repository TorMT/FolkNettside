<?php
require __DIR__ . '/common.php';
$configPath = aps_resolve_config_path($_GET['config'] ?? '');
$config = aps_read_json_file($configPath);

if (!empty($config['demoModels']) && empty($config['hubId']) && empty($config['projectId']) && empty($config['folderId'])) {
    aps_json_response([
        'notice' => $config['demoNotice'] ?? 'Demo-oppsett aktivt. Legg inn hubId/projectId/folderId og secrets for live APS-visning.',
        'models' => $config['demoModels'],
        'mode' => 'demo',
    ]);
}

$hubId = $config['hubId'] ?? '';
$projectId = $config['projectId'] ?? '';
$folderId = $config['folderId'] ?? '';
if ($hubId === '' || $projectId === '' || $folderId === '') {
    aps_error('Config mangler hubId/projectId/folderId, og ingen demoModels er definert.', 400);
}

$token = aps_fetch_token($config);
$models = aps_collect_folder_models($projectId, $folderId, $token['access_token'] ?? '', $config['rootLabel'] ?? '', 0, (int)($config['maxDepth'] ?? 6));
aps_json_response([
    'notice' => sprintf('Fant %d APS-modeller.', count($models)),
    'models' => $models,
    'mode' => 'live',
]);
