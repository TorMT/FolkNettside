<?php
require_once __DIR__ . '/common.php';

function brewing_provider_statuses(): array {
    $secrets = brewing_load_api_secrets();

    return [
        [
            'id' => 'local',
            'label' => 'Lokal',
            'active' => true,
            'configured' => true,
            'details' => 'Leser oppskrifter fra lokal oppskriftsmappe.',
        ],
        [
            'id' => 'openbrewery',
            'label' => 'Open Brewery DB',
            'active' => true,
            'configured' => true,
            'details' => 'Brukes for brewery-oppslag uten nøkler.',
        ],
        [
            'id' => 'catalogbeer',
            'label' => 'Catalog.beer',
            'active' => $secrets['catalogBeerApiKey'] !== '',
            'configured' => $secrets['catalogBeerApiKey'] !== '',
            'details' => $secrets['catalogBeerApiKey'] !== ''
                ? 'API-nøkkel er funnet og provider kan brukes.'
                : 'Venter på catalogBeerApiKey i secrets/brewing-apis.local.json.',
        ],
        [
            'id' => 'brewfather',
            'label' => 'Brewfather',
            'active' => $secrets['brewfatherUserId'] !== '' && $secrets['brewfatherApiKey'] !== '',
            'configured' => $secrets['brewfatherUserId'] !== '' && $secrets['brewfatherApiKey'] !== '',
            'details' => ($secrets['brewfatherUserId'] !== '' && $secrets['brewfatherApiKey'] !== '')
                ? 'Brewfather-credentials er funnet og recipes.read/inventory.read kan brukes.'
                : 'Venter på brewfatherUserId og brewfatherApiKey i secrets/brewing-apis.local.json.',
        ],
    ];
}

function brewing_slug_from_filename(string $filename): string {
    $base = pathinfo($filename, PATHINFO_FILENAME);
    return brewing_slugify($base);
}

function brewing_normalize_token(string $value): string {
    $value = trim(function_exists('mb_strtolower') ? mb_strtolower($value, 'UTF-8') : strtolower($value));
    $ascii = function_exists('iconv') ? @iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $value) : $value;
    $normalized = is_string($ascii) && $ascii !== '' ? $ascii : $value;
    $normalized = preg_replace('/[^a-z0-9]+/', ' ', $normalized) ?: '';
    return trim($normalized);
}

function brewing_parse_query_ingredients(string $query): array {
    $parts = preg_split('/[,;\n]+/', $query) ?: [];
    $tokens = [];
    foreach ($parts as $part) {
        $normalized = brewing_normalize_token($part);
        if ($normalized !== '') {
            $tokens[] = $normalized;
        }
    }
    return array_values(array_unique($tokens));
}

function brewing_collect_recipe_ingredient_names(array $recipe): array {
    $groups = ['malts', 'hops', 'yeast', 'misc'];
    $names = [];
    foreach ($groups as $group) {
        foreach ((array)($recipe['ingredients'][$group] ?? []) as $ingredient) {
            $name = brewing_normalize_token((string)($ingredient['name'] ?? ''));
            if ($name !== '') {
                $names[] = $name;
            }
        }
    }
    return array_values(array_unique($names));
}

function brewing_match_score(array $recipe, array $queryIngredients): array {
    if (empty($queryIngredients)) {
        return ['score' => 0, 'ratio' => 0, 'matched' => []];
    }

    $available = brewing_collect_recipe_ingredient_names($recipe);
    if (empty($available)) {
        return ['score' => 0, 'ratio' => 0, 'matched' => []];
    }

    $matched = [];
    foreach ($queryIngredients as $needle) {
        foreach ($available as $candidate) {
            if ($needle === $candidate || strpos($candidate, $needle) !== false || strpos($needle, $candidate) !== false) {
                $matched[$needle] = true;
                break;
            }
        }
    }

    $score = count($matched);
    $ratio = $score / max(1, count($queryIngredients));
    return [
        'score' => $score,
        'ratio' => $ratio,
        'matched' => array_keys($matched),
    ];
}

function brewing_normalize_recipe(array $recipe, string $source, string $slug): array {
    $match = $recipe['_match'] ?? ['score' => 0, 'ratio' => 0, 'matched' => []];
    $targets = is_array($recipe['targets'] ?? null) ? $recipe['targets'] : [];
    $steps = array_values(array_filter((array)($recipe['steps'] ?? []), static function ($step) {
        return is_array($step) && trim((string)($step['title'] ?? $step['details'] ?? '')) !== '';
    }));

    return [
        'schemaVersion' => (int)($recipe['schemaVersion'] ?? 1),
        'id' => $slug,
        'slug' => $slug,
        'source' => $source,
        'providerLabel' => $source === 'brewfather' ? 'Brewfather' : 'Lokal',
        'name' => (string)($recipe['name'] ?? 'Uten navn'),
        'style' => (string)($recipe['style'] ?? ''),
        'rating' => (float)($recipe['rating'] ?? 0),
        'batchVolume' => $recipe['batchVolume'] ?? null,
        'ingredients' => is_array($recipe['ingredients'] ?? null) ? $recipe['ingredients'] : [],
        'steps' => $steps,
        'targets' => $targets,
        'nutritionOverrides' => is_array($recipe['nutritionOverrides'] ?? null) ? $recipe['nutritionOverrides'] : [],
        'notes' => (string)($recipe['notes'] ?? ''),
        'matchScore' => (int)($match['score'] ?? 0),
        'matchRatio' => (float)($match['ratio'] ?? 0),
        'matchedIngredients' => array_values((array)($match['matched'] ?? [])),
    ];
}

function brewing_read_local_recipes(string $query = ''): array {
    $root = brewing_ensure_recipe_root();
    $queryIngredients = brewing_parse_query_ingredients($query);
    $recipes = [];

    foreach (glob($root . DIRECTORY_SEPARATOR . '*.json') ?: [] as $path) {
        $recipe = brewing_read_json_file($path);
        $recipe['_match'] = brewing_match_score($recipe, $queryIngredients);
        $recipes[] = brewing_normalize_recipe($recipe, 'local', brewing_slug_from_filename(basename($path)));
    }

    usort($recipes, static function ($a, $b) {
        $score = ($b['matchRatio'] <=> $a['matchRatio']);
        if ($score !== 0) return $score;
        $rating = ($b['rating'] <=> $a['rating']);
        if ($rating !== 0) return $rating;
        return strnatcasecmp((string)$a['name'], (string)$b['name']);
    });

    return $recipes;
}

function brewing_fetch_brewfather_recipes(string $query = ''): array {
    $secrets = brewing_load_api_secrets();
    if ($secrets['brewfatherUserId'] === '' || $secrets['brewfatherApiKey'] === '') {
        return [];
    }

    $headers = [
        brewing_basic_auth_header($secrets['brewfatherUserId'], $secrets['brewfatherApiKey']),
        'Accept: application/json',
    ];
    $response = brewing_http_json('https://api.brewfather.app/v2/recipes?limit=50&complete=true', $headers);
    if (isset($response['_error'])) {
        return [];
    }

    $items = array_values((array)($response['items'] ?? $response));
    $queryIngredients = brewing_parse_query_ingredients($query);
    $recipes = [];

    foreach ($items as $item) {
        if (!is_array($item)) continue;

        $recipe = [
            'schemaVersion' => 1,
            'name' => $item['name'] ?? 'Brewfather-oppskrift',
            'style' => $item['style']['name'] ?? ($item['style'] ?? ''),
            'rating' => $item['rating'] ?? 0,
            'batchVolume' => $item['batchSize'] ?? null,
            'ingredients' => [
                'malts' => array_map(static function ($fermentable) {
                    return [
                        'name' => $fermentable['name'] ?? '',
                        'amount' => $fermentable['amount'] ?? null,
                        'unit' => $fermentable['unit'] ?? 'kg',
                    ];
                }, (array)($item['fermentables'] ?? [])),
                'hops' => array_map(static function ($hop) {
                    return [
                        'name' => $hop['name'] ?? '',
                        'amount' => $hop['amount'] ?? null,
                        'unit' => $hop['unit'] ?? 'g',
                    ];
                }, (array)($item['hops'] ?? [])),
                'yeast' => array_map(static function ($yeast) {
                    return [
                        'name' => $yeast['name'] ?? '',
                        'amount' => $yeast['amount'] ?? null,
                        'unit' => $yeast['unit'] ?? 'pkg',
                    ];
                }, (array)($item['yeasts'] ?? [])),
                'misc' => array_map(static function ($misc) {
                    return [
                        'name' => $misc['name'] ?? '',
                        'amount' => $misc['amount'] ?? null,
                        'unit' => $misc['unit'] ?? '',
                    ];
                }, (array)($item['miscs'] ?? [])),
            ],
            'steps' => [],
            'targets' => [
                'og' => $item['og'] ?? null,
                'fg' => $item['fg'] ?? null,
                'abv' => $item['abv'] ?? null,
                'ibu' => $item['ibu'] ?? null,
                'srm' => $item['srm'] ?? null,
            ],
            'notes' => $item['notes'] ?? '',
        ];

        if (trim((string)$recipe['notes']) !== '') {
            $recipe['steps'][] = [
                'title' => 'Bryggnotater',
                'details' => trim((string)$recipe['notes']),
            ];
        }

        $recipe['_match'] = brewing_match_score($recipe, $queryIngredients);
        $slug = brewing_slugify((string)($item['_id'] ?? $item['id'] ?? $recipe['name']));
        $recipes[] = brewing_normalize_recipe($recipe, 'brewfather', $slug);
    }

    usort($recipes, static function ($a, $b) {
        $score = ($b['matchRatio'] <=> $a['matchRatio']);
        if ($score !== 0) return $score;
        $rating = ($b['rating'] <=> $a['rating']);
        if ($rating !== 0) return $rating;
        return strnatcasecmp((string)$a['name'], (string)$b['name']);
    });

    return $recipes;
}

function brewing_fetch_openbrewery_references(string $query): array {
    $query = trim($query);
    if ($query === '') return [];

    $url = 'https://api.openbrewerydb.org/v1/breweries/search?query=' . rawurlencode($query) . '&per_page=6';
    $response = brewing_http_json($url, ['Accept: application/json']);
    if (isset($response['_error'])) {
        return [];
    }

    $entries = [];
    foreach ((array)$response as $item) {
        if (!is_array($item)) continue;
        $entries[] = [
            'provider' => 'Open Brewery DB',
            'title' => (string)($item['name'] ?? 'Bryggeri'),
            'subtitle' => trim((string)(($item['brewery_type'] ?? '') . ' ' . ($item['city'] ?? '') . ' ' . ($item['country'] ?? ''))),
            'url' => (string)($item['website_url'] ?? ''),
            'meta' => [
                'state' => $item['state'] ?? null,
                'city' => $item['city'] ?? null,
            ],
        ];
    }

    return $entries;
}

function brewing_fetch_catalog_references(string $query): array {
    $query = trim($query);
    $secrets = brewing_load_api_secrets();
    if ($query === '' || $secrets['catalogBeerApiKey'] === '') {
        return [];
    }

    $headers = [
        brewing_basic_auth_header($secrets['catalogBeerApiKey']),
        'Accept: application/json',
    ];

    $beerResponse = brewing_http_json('https://api.catalog.beer/beer/search?q=' . rawurlencode($query), $headers);
    $brewerResponse = brewing_http_json('https://api.catalog.beer/brewer/search?q=' . rawurlencode($query), $headers);
    $entries = [];

    foreach ((array)($beerResponse['items'] ?? $beerResponse['data'] ?? []) as $item) {
        if (!is_array($item)) continue;
        $entries[] = [
            'provider' => 'Catalog.beer',
            'title' => (string)($item['name'] ?? 'Beer hit'),
            'subtitle' => (string)($item['style'] ?? ($item['brewer']['name'] ?? '')),
            'url' => (string)($item['url'] ?? ''),
            'meta' => [
                'abv' => $item['abv'] ?? null,
                'ibu' => $item['ibu'] ?? null,
            ],
        ];
    }

    foreach ((array)($brewerResponse['items'] ?? $brewerResponse['data'] ?? []) as $item) {
        if (!is_array($item)) continue;
        $entries[] = [
            'provider' => 'Catalog.beer',
            'title' => (string)($item['name'] ?? 'Brewer hit'),
            'subtitle' => (string)($item['country'] ?? ''),
            'url' => (string)($item['url'] ?? ''),
            'meta' => [
                'country' => $item['country'] ?? null,
            ],
        ];
    }

    return array_slice($entries, 0, 6);
}
