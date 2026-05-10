<?php
function rapt_repo_root() {
    return realpath(__DIR__ . '/../../../');
}

function rapt_json_response($data, int $code = 200): void {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
    exit;
}

function rapt_error(string $message, int $code = 500, array $extra = []): void {
    rapt_json_response(array_merge(['error' => $message], $extra), $code);
}

function rapt_read_json_file(string $path): array {
    if (!is_file($path)) {
        rapt_error('Missing file: ' . $path, 404);
    }
    $raw = file_get_contents($path);
    $data = json_decode($raw ?: '', true);
    if (!is_array($data)) {
        rapt_error('Invalid JSON in ' . basename($path), 500);
    }
    return $data;
}

function rapt_load_secrets(): array {
    $secretPath = rapt_repo_root() . DIRECTORY_SEPARATOR . 'secrets' . DIRECTORY_SEPARATOR . 'rapt.local.json';
    if (is_file($secretPath)) {
        $data = rapt_read_json_file($secretPath);
        return [
            'username' => trim((string)($data['username'] ?? $data['RAPT_USERNAME'] ?? '')),
            'apiSecret' => trim((string)($data['apiSecret'] ?? $data['apiKey'] ?? $data['RAPT_API_SECRET'] ?? '')),
        ];
    }

    return [
        'username' => trim((string)(getenv('RAPT_USERNAME') ?: '')),
        'apiSecret' => trim((string)(getenv('RAPT_API_SECRET') ?: '')),
    ];
}

function rapt_resolve_username(array $secrets): string {
    $queryUsername = trim((string)($_GET['username'] ?? $_POST['username'] ?? ''));
    $username = $queryUsername !== '' ? $queryUsername : trim((string)($secrets['username'] ?? ''));
    if ($username === '') {
        rapt_error('Missing RAPT username. Add it to secrets/rapt.local.json or send ?username=your-login.', 400);
    }
    return $username;
}

function rapt_http_json(string $url, string $method = 'GET', ?array $headers = null, ?string $body = null): array {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_HTTPHEADER => $headers ?: [],
        CURLOPT_POSTFIELDS => $body,
        CURLOPT_TIMEOUT => 30,
    ]);
    $response = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    $error = curl_error($ch);
    curl_close($ch);

    if ($response === false) {
        rapt_error('RAPT request failed: ' . $error, 502);
    }

    $json = json_decode($response, true);
    if ($status >= 400) {
        rapt_error('RAPT request failed.', $status, ['details' => $json ?: $response]);
    }
    return is_array($json) ? $json : [];
}

function rapt_fetch_token(?string $username = null): array {
    $secrets = rapt_load_secrets();
    $resolvedUsername = trim((string)($username ?: rapt_resolve_username($secrets)));
    $apiSecret = trim((string)($secrets['apiSecret'] ?? ''));

    if ($apiSecret === '') {
        rapt_error('Missing RAPT API secret. Add secrets/rapt.local.json or RAPT_API_SECRET env var.', 501);
    }

    $body = http_build_query([
        'client_id' => 'rapt-user',
        'grant_type' => 'password',
        'username' => $resolvedUsername,
        'password' => $apiSecret,
    ]);

    return rapt_http_json(
        'https://id.rapt.io/connect/token',
        'POST',
        [
            'Content-Type: application/x-www-form-urlencoded',
            'Accept: application/json',
        ],
        $body
    );
}

function rapt_get_json(string $url, string $token): array {
    return rapt_http_json($url, 'GET', [
        'Authorization: Bearer ' . $token,
        'Accept: application/json',
    ]);
}

function rapt_parse_iso_timestamp(?string $value): ?int {
    $raw = trim((string)($value ?? ''));
    if ($raw === '') return null;
    try {
        $dt = new DateTimeImmutable($raw);
        return $dt->getTimestamp();
    } catch (Throwable $e) {
        return null;
    }
}

function rapt_parse_gravity_specific($value): ?float {
    if (!is_numeric($value)) return null;
    $numeric = (float)$value;
    if (!is_finite($numeric) || $numeric <= 0) return null;
    return $numeric >= 10.0 ? $numeric / 1000.0 : $numeric;
}

function rapt_numeric_field(array $row, string $field): ?float {
    if (!array_key_exists($field, $row) || !is_numeric($row[$field])) return null;
    $value = (float)$row[$field];
    return is_finite($value) ? $value : null;
}

function rapt_median(array $values): ?float {
    $valid = array_values(array_filter($values, static function ($value) {
        return is_numeric($value) && is_finite((float)$value);
    }));
    if (empty($valid)) return null;
    sort($valid, SORT_NUMERIC);
    $count = count($valid);
    $mid = intdiv($count, 2);
    if (($count % 2) === 1) {
        return (float)$valid[$mid];
    }
    return ((float)$valid[$mid - 1] + (float)$valid[$mid]) / 2.0;
}

function rapt_spread(array $values): ?float {
    $valid = array_values(array_filter($values, static function ($value) {
        return is_numeric($value) && is_finite((float)$value);
    }));
    if (empty($valid)) return null;
    return (float)max($valid) - (float)min($valid);
}

function rapt_collect_neighbor_rows(array $rows, int $index, int $windowSeconds = 18000, int $maxEachSide = 2): array {
    $neighbors = [];
    $currentTs = rapt_parse_iso_timestamp($rows[$index]['createdOn'] ?? null);
    if ($currentTs === null) return $neighbors;

    $found = 0;
    for ($j = $index - 1; $j >= 0 && $found < $maxEachSide; $j--) {
        $ts = rapt_parse_iso_timestamp($rows[$j]['createdOn'] ?? null);
        if ($ts === null) continue;
        if (($currentTs - $ts) > $windowSeconds) break;
        $neighbors[] = $rows[$j];
        $found++;
    }

    $found = 0;
    for ($j = $index + 1; $j < count($rows) && $found < $maxEachSide; $j++) {
        $ts = rapt_parse_iso_timestamp($rows[$j]['createdOn'] ?? null);
        if ($ts === null) continue;
        if (($ts - $currentTs) > $windowSeconds) break;
        $neighbors[] = $rows[$j];
        $found++;
    }

    return $neighbors;
}

function rapt_is_extreme_ratio(?float $candidate, ?float $reference, float $threshold = 100.0): bool {
    if (!is_finite($candidate) || !is_finite($reference)) return false;
    $candidate = abs($candidate);
    $reference = abs($reference);
    if ($candidate <= 0 || $reference <= 0) return false;

    $ratio = max($candidate, $reference) / min($candidate, $reference);
    return $ratio >= $threshold;
}

function rapt_filter_extreme_telemetry_rows(array $rows, int $windowSeconds = 18000, float $ratioThreshold = 100.0): array {
    $working = array_values($rows);
    if (count($working) < 3) return $working;

    for ($pass = 0; $pass < 2; $pass++) {
        $count = count($working);
        $shouldDrop = array_fill(0, $count, false);
        $droppedAny = false;

        for ($i = 0; $i < $count; $i++) {
            $neighbors = rapt_collect_neighbor_rows($working, $i, $windowSeconds, 4);
            if (empty($neighbors)) continue;

            $candidateGravityRaw = rapt_numeric_field($working[$i], 'gravity');
            $candidateGravitySg = rapt_parse_gravity_specific($working[$i]['gravity'] ?? null);
            $candidateTemp = rapt_numeric_field($working[$i], 'temperature');
            $candidateBattery = rapt_numeric_field($working[$i], 'battery');

            $neighborGravityRaw = [];
            $neighborGravitySg = [];
            $neighborTemps = [];
            $neighborBatteries = [];
            foreach ($neighbors as $neighbor) {
                $raw = rapt_numeric_field($neighbor, 'gravity');
                if ($raw !== null) $neighborGravityRaw[] = $raw;
                $sg = rapt_parse_gravity_specific($neighbor['gravity'] ?? null);
                if ($sg !== null) $neighborGravitySg[] = $sg;
                $temp = rapt_numeric_field($neighbor, 'temperature');
                if ($temp !== null) $neighborTemps[] = $temp;
                $battery = rapt_numeric_field($neighbor, 'battery');
                if ($battery !== null) $neighborBatteries[] = $battery;
            }

            $currentTs = rapt_parse_iso_timestamp($working[$i]['createdOn'] ?? null);
            $prevRow = null;
            $nextRow = null;
            if ($currentTs !== null) {
                for ($j = $i - 1; $j >= 0; $j--) {
                    $ts = rapt_parse_iso_timestamp($working[$j]['createdOn'] ?? null);
                    if ($ts === null) continue;
                    if (($currentTs - $ts) > $windowSeconds) break;
                    $prevRow = $working[$j];
                    break;
                }
                for ($j = $i + 1; $j < $count; $j++) {
                    $ts = rapt_parse_iso_timestamp($working[$j]['createdOn'] ?? null);
                    if ($ts === null) continue;
                    if (($ts - $currentTs) > $windowSeconds) break;
                    $nextRow = $working[$j];
                    break;
                }
            }

            $prevGravitySg = $prevRow ? rapt_parse_gravity_specific($prevRow['gravity'] ?? null) : null;
            $nextGravitySg = $nextRow ? rapt_parse_gravity_specific($nextRow['gravity'] ?? null) : null;
            $prevTemp = $prevRow ? rapt_numeric_field($prevRow, 'temperature') : null;
            $nextTemp = $nextRow ? rapt_numeric_field($nextRow, 'temperature') : null;

            $gravityExtreme = false;
            $tempExtreme = false;
            $batteryExtreme = false;

            foreach ($neighborGravityRaw as $referenceGravityRaw) {
                $gravityExtreme = $gravityExtreme || rapt_is_extreme_ratio($candidateGravityRaw, $referenceGravityRaw, $ratioThreshold);
            }

            $gravityMedianSg = rapt_median($neighborGravitySg);
            $gravitySpreadSg = rapt_spread($neighborGravitySg);
            $tempMedian = rapt_median($neighborTemps);
            $batteryMedian = rapt_median($neighborBatteries);
            $tempSpread = rapt_spread($neighborTemps);
            $tempLooksStable = ($tempMedian !== null && $candidateTemp !== null && abs($candidateTemp - $tempMedian) <= 2.4)
                || ($tempSpread !== null && $tempSpread <= 2.5);
            $gravityLooksStable = $gravitySpreadSg !== null && $gravitySpreadSg <= 0.028;

            if ($candidateGravitySg !== null) {
                if ($candidateGravitySg < 0.850 || $candidateGravitySg > 1.350) {
                    $gravityExtreme = true;
                }

                if ($gravityMedianSg !== null) {
                    $gravityJump = abs($candidateGravitySg - $gravityMedianSg);
                    if ($gravityLooksStable && $tempLooksStable && $gravityJump >= 0.040) {
                        $gravityExtreme = true;
                    }
                    if ($tempLooksStable && $gravityJump >= 0.075) {
                        $gravityExtreme = true;
                    }
                    if ($gravityJump >= 0.120) {
                        $gravityExtreme = true;
                    }
                }

                if ($prevGravitySg !== null && $nextGravitySg !== null) {
                    $bridgeSpread = abs($prevGravitySg - $nextGravitySg);
                    $bridgeMid = ($prevGravitySg + $nextGravitySg) / 2.0;
                    $bridgeJump = abs($candidateGravitySg - $bridgeMid);
                    $bridgeTempMedian = rapt_median([$prevTemp, $nextTemp]);
                    $bridgeTempStable = ($bridgeTempMedian !== null && $candidateTemp !== null && abs($candidateTemp - $bridgeTempMedian) <= 2.5)
                        || ($tempSpread !== null && $tempSpread <= 2.5);

                    if ($bridgeSpread <= 0.025 && $bridgeTempStable && $bridgeJump >= 0.035) {
                        $gravityExtreme = true;
                    }
                    if ($bridgeSpread <= 0.040 && $bridgeJump >= 0.055) {
                        $gravityExtreme = true;
                    }
                } elseif ($gravityMedianSg !== null && $tempLooksStable && abs($candidateGravitySg - $gravityMedianSg) >= 0.100) {
                    $gravityExtreme = true;
                }
            }

            if ($candidateTemp !== null) {
                if ($candidateTemp < -5.0 || $candidateTemp > 45.0) {
                    $tempExtreme = true;
                }
                if ($tempMedian !== null && abs($candidateTemp - $tempMedian) >= 8.0 && $gravityLooksStable) {
                    $tempExtreme = true;
                }
            }

            if ($candidateBattery !== null && $batteryMedian !== null) {
                if (abs($candidateBattery - $batteryMedian) >= 55.0) {
                    $batteryExtreme = true;
                }
            }

            if ($gravityExtreme || $tempExtreme || $batteryExtreme) {
                $shouldDrop[$i] = true;
                $droppedAny = true;
            }
        }

        if (!$droppedAny) {
            break;
        }

        $working = array_values(array_filter($working, static function ($row, $index) use ($shouldDrop) {
            return !$shouldDrop[$index];
        }, ARRAY_FILTER_USE_BOTH));

        if (count($working) < 3) {
            break;
        }
    }

    return $working;
}
