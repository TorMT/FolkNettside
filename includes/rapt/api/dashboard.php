<?php
require __DIR__ . '/common.php';

$secrets = rapt_load_secrets();
$username = rapt_resolve_username($secrets);
$token = rapt_fetch_token($username);
$accessToken = trim((string)($token['access_token'] ?? ''));
if ($accessToken === '') {
    rapt_error('Missing RAPT access token.', 502);
}

$daysParam = strtolower(trim((string)($_GET['days'] ?? '7')));
$days = $daysParam === 'max' ? 3650 : (int)$daysParam;
if ($days < 1) $days = 1;
if ($days > 3650) $days = 3650;

$end = new DateTimeImmutable('now', new DateTimeZone('UTC'));
$start = $end->sub(new DateInterval('P' . $days . 'D'));

$items = rapt_get_json('https://api.rapt.io/api/Hydrometers/GetHydrometers', $accessToken);
$devices = [];

foreach ((array)$items as $item) {
    $hydrometerId = trim((string)($item['id'] ?? ''));
    if ($hydrometerId === '') continue;

    $telemetryUrl = 'https://api.rapt.io/api/Hydrometers/GetTelemetry?hydrometerId='
        . rawurlencode($hydrometerId)
        . '&startDate=' . rawurlencode($start->format(DATE_ATOM))
        . '&endDate=' . rawurlencode($end->format(DATE_ATOM));

    $history = rapt_get_json($telemetryUrl, $accessToken);
    usort($history, static function ($a, $b) {
        return strcmp((string)($a['createdOn'] ?? ''), (string)($b['createdOn'] ?? ''));
    });
    $rawHistoryCount = count($history);
    $history = rapt_filter_extreme_telemetry_rows($history, 5 * 60 * 60, 20.0);
    $filteredOutCount = $rawHistoryCount - count($history);
    $firstHistoryAt = !empty($history) ? ($history[0]['createdOn'] ?? null) : null;
    $activeProfileStartDate = $item['activeProfileSession']['startDate'] ?? null;
    $historyStartUsed = $activeProfileStartDate ?: $firstHistoryAt;

    $latest = null;
    if (!empty($history)) {
        $latest = $history[count($history) - 1];
    } elseif (!empty($item['telemetry']) && is_array($item['telemetry'])) {
        $latest = $item['telemetry'][0];
    }

    $devices[] = [
        'id' => $hydrometerId,
        'name' => $item['name'] ?? 'Uten navn',
        'macAddress' => $item['macAddress'] ?? '',
        'firmwareVersion' => $item['firmwareVersion'] ?? '',
        'isLatestFirmware' => (bool)($item['isLatestFirmware'] ?? false),
        'lastActivityTime' => $item['lastActivityTime'] ?? ($latest['createdOn'] ?? null),
        'activeProfileName' => $item['activeProfileSession']['name'] ?? null,
        'activeProfileSessionStartDate' => $activeProfileStartDate,
        'activeProfileSessionEstimatedEndDate' => $item['activeProfileSession']['estimatedEndDate'] ?? null,
        'activeProfileOriginalGravity' => $item['activeProfileSession']['originalGravity'] ?? null,
        'activeProfileFinalGravity' => $item['activeProfileSession']['finalGravity'] ?? null,
        'firstHistoryAt' => $firstHistoryAt,
        'historyStartUsed' => $historyStartUsed,
        'temperature' => $item['temperature'] ?? ($latest['temperature'] ?? null),
        'gravity' => $item['gravity'] ?? ($latest['gravity'] ?? null),
        'gravityVelocity' => $item['gravityVelocity'] ?? ($latest['gravityVelocity'] ?? null),
        'battery' => $item['battery'] ?? ($latest['battery'] ?? null),
        'rssi' => $item['rssi'] ?? ($latest['rssi'] ?? null),
        'filteredOutCount' => $filteredOutCount,
        'history' => array_map(static function ($row) {
            return [
                'createdOn' => $row['createdOn'] ?? null,
                'temperature' => $row['temperature'] ?? null,
                'gravity' => $row['gravity'] ?? null,
                'gravityVelocity' => $row['gravityVelocity'] ?? null,
                'battery' => $row['battery'] ?? null,
                'rssi' => $row['rssi'] ?? null,
            ];
        }, (array)$history),
    ];
}

rapt_json_response([
    'username' => $username,
    'days' => $daysParam === 'max' ? 'max' : $days,
    'generatedAt' => $end->format(DATE_ATOM),
    'count' => count($devices),
    'devices' => $devices,
]);
