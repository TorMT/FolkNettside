<?php
require_once __DIR__ . '/common.php';

function brewing_provider_statuses(): array {
    $secrets = brewing_load_api_secrets();
    $storageConfig = brewing_read_storage_config();
    $driveConfigured = trim((string)($storageConfig['googleDrive']['shareUrl'] ?? '')) !== ''
        || trim((string)($storageConfig['googleDrive']['folderId'] ?? '')) !== ''
        || $secrets['googleDriveFolderId'] !== ''
        || $secrets['googleDriveShareUrl'] !== '';

    return [
        [
            'id' => 'local',
            'label' => 'Lokal',
            'active' => true,
            'configured' => true,
            'details' => 'Leser oppskrifter fra lokal oppskriftsmappe.',
        ],
        [
            'id' => 'olbrygging',
            'label' => 'Ølbrygging',
            'active' => true,
            'configured' => true,
            'details' => 'Brukes som butikkatalog for malt og humle.',
        ],
        [
            'id' => 'hopdatabase',
            'label' => 'HopDatabase',
            'active' => true,
            'configured' => true,
            'details' => 'Brukes for humleprofiler og substitutionsforslag.',
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
            'id' => 'punkapi',
            'label' => 'Punk API',
            'active' => true,
            'configured' => true,
            'details' => 'Brukes via offentlig mirror for kommersielle beer-referanser.',
        ],
        [
            'id' => 'tapline',
            'label' => 'Tapline',
            'active' => true,
            'configured' => true,
            'details' => 'Brukes som bryggeteknisk referanse for konvertering og oppskriftsformat.',
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
        [
            'id' => 'googledrive',
            'label' => 'Google Drive',
            'active' => $driveConfigured,
            'configured' => $driveConfigured,
            'details' => $driveConfigured
                ? 'Drive-mappe eller delingslenke er lagt inn for ekstern loggarkivering.'
                : 'Ikke koblet til ennå, men egner seg godt for bildefiler og ferdige bryggelogger.',
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
        'sortIndex' => isset($recipe['_sortIndex']) ? (int)$recipe['_sortIndex'] : 999999,
    ];
}

function brewing_read_recipe_manifest(string $root): array {
    $path = $root . DIRECTORY_SEPARATOR . '_manifest.json';
    if (!is_file($path)) {
        return [];
    }

    $manifest = brewing_read_json_file($path);
    $files = array_values(array_filter((array)($manifest['files'] ?? []), static function ($file) {
        return is_string($file) && trim($file) !== '';
    }));

    $index = [];
    foreach ($files as $position => $file) {
        $index[basename($file)] = $position;
    }

    return $index;
}

function brewing_read_local_recipes(string $query = ''): array {
    $root = brewing_ensure_recipe_root();
    $queryIngredients = brewing_parse_query_ingredients($query);
    $manifestOrder = brewing_read_recipe_manifest($root);
    $recipes = [];

    foreach (glob($root . DIRECTORY_SEPARATOR . '*.json') ?: [] as $path) {
        $basename = basename($path);
        if ($basename === '_manifest.json' || strncmp($basename, '_', 1) === 0) {
            continue;
        }
        $recipe = brewing_read_json_file($path);
        $recipe['_sortIndex'] = $manifestOrder[$basename] ?? 999999;
        $recipe['_match'] = brewing_match_score($recipe, $queryIngredients);
        $recipes[] = brewing_normalize_recipe($recipe, 'local', brewing_slug_from_filename($basename));
    }

    usort($recipes, static function ($a, $b) {
        $score = ($b['matchRatio'] <=> $a['matchRatio']);
        if ($score !== 0) return $score;
        $sortIndex = (($a['sortIndex'] ?? 999999) <=> ($b['sortIndex'] ?? 999999));
        if ($sortIndex !== 0) return $sortIndex;
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

function brewing_extract_numeric_range(string $text, string $unit): array {
    $pattern = '/(\d+(?:[.,]\d+)?)\s*(?:-\s*(\d+(?:[.,]\d+)?))?\s*' . preg_quote($unit, '/') . '/iu';
    if (!preg_match($pattern, $text, $matches)) {
        return ['low' => null, 'high' => null];
    }

    $low = (float)str_replace(',', '.', $matches[1]);
    $high = isset($matches[2]) && $matches[2] !== '' ? (float)str_replace(',', '.', $matches[2]) : $low;
    return ['low' => $low, 'high' => $high];
}

function brewing_clean_shop_name(string $name): string {
    $decoded = html_entity_decode(strip_tags($name), ENT_QUOTES | ENT_HTML5, 'UTF-8');
    $decoded = preg_replace('/\s+/', ' ', $decoded ?: '') ?: '';
    return trim($decoded);
}

function brewing_simplify_shop_name(string $name): string {
    $value = brewing_clean_shop_name($name);
    $value = preg_replace('/\b\d+(?:[.,]\d+)?\s*(kg|g|gram|grams)\b/iu', '', $value) ?: $value;
    $value = preg_replace('/\b(hel|knust|pellets?|nitrogenpakket)\b/iu', '', $value) ?: $value;
    $value = preg_replace('/\b20\d{2}\b/u', '', $value) ?: $value;
    $value = preg_replace('/\b\d+(?:[.,]\d+)?\s*%\s*(aa|alfasyre)\b/iu', '', $value) ?: $value;
    $value = preg_replace('/\b(aa|alfasyre)\b/iu', '', $value) ?: $value;
    $value = preg_replace('/\s*-\s*[^-]+$/u', '', $value) ?: $value;
    $value = preg_replace('/[,:;]+/u', ' ', $value) ?: $value;
    $value = preg_replace('/\s+/', ' ', $value) ?: $value;
    return trim($value);
}

function brewing_parse_olbrygging_items(string $html, string $kind): array {
    $pattern = '~<a\s+href="([^"]+)"\s+class="AdProductLink">\s*'
        . '<span\s+class="AddHeader1">(.*?)</span>\s*'
        . '<span\s+class="AddHeader2">(.*?)</span>\s*'
        . '</a>~isu';

    if (!preg_match_all($pattern, $html, $matches, PREG_SET_ORDER)) {
        return [];
    }

    $items = [];
    foreach ($matches as $match) {
        $href = trim((string)($match[1] ?? ''));
        $namePart1 = brewing_clean_shop_name((string)($match[2] ?? ''));
        $namePart2 = brewing_clean_shop_name((string)($match[3] ?? ''));
        $name = trim($namePart1 . ($namePart2 !== '' ? (' ' . $namePart2) : ''));
        if ($href === '' || $name === '' || $href[0] !== '/') continue;

        $range = brewing_extract_numeric_range($name, $kind === 'malt' ? 'EBC' : '%');
        $baseName = brewing_simplify_shop_name($name);
        $baseKey = brewing_normalize_token($baseName);
        if ($baseKey === '') continue;

        if (!isset($items[$baseKey])) {
            $items[$baseKey] = [
                'name' => $baseName,
                'displayName' => $baseName,
                'baseName' => $baseName,
                'key' => $baseKey,
                'url' => 'https://www.olbrygging.no' . $href,
                'kind' => $kind,
                'ebcLow' => $kind === 'malt' ? $range['low'] : null,
                'ebcHigh' => $kind === 'malt' ? $range['high'] : null,
                'alphaLow' => $kind === 'hop' ? $range['low'] : null,
                'alphaHigh' => $kind === 'hop' ? $range['high'] : null,
                'variants' => [],
            ];
        }

        $variants = (array)$items[$baseKey]['variants'];
        $variants[] = $name;
        $items[$baseKey]['variants'] = array_values(array_unique($variants));

        if ($items[$baseKey]['url'] === '') {
            $items[$baseKey]['url'] = 'https://www.olbrygging.no' . $href;
        }

        if ($kind === 'malt' && $items[$baseKey]['ebcLow'] === null && $range['low'] !== null) {
            $items[$baseKey]['ebcLow'] = $range['low'];
            $items[$baseKey]['ebcHigh'] = $range['high'];
        }

        if ($kind === 'hop' && $items[$baseKey]['alphaLow'] === null && $range['low'] !== null) {
            $items[$baseKey]['alphaLow'] = $range['low'];
            $items[$baseKey]['alphaHigh'] = $range['high'];
        }
    }

    return array_values($items);
}

function brewing_fetch_olbrygging_catalog(): array {
    $cached = brewing_read_cache_file('olbrygging-catalog.json', 12 * 60 * 60);
    if (
        $cached !== null
        && (
            !empty($cached['malts'])
            || !empty($cached['hops'])
        )
    ) {
        return $cached;
    }

    $maltResponse = brewing_http_text('https://www.olbrygging.no/ol/ingredienser/malt', ['Accept: text/html']);
    $hopResponse = brewing_http_text('https://www.olbrygging.no/ol/ingredienser/humle', ['Accept: text/html']);

    $payload = [
        'updatedAt' => gmdate(DATE_ATOM),
        'malts' => $maltResponse['ok'] ? brewing_parse_olbrygging_items($maltResponse['body'], 'malt') : [],
        'hops' => $hopResponse['ok'] ? brewing_parse_olbrygging_items($hopResponse['body'], 'hop') : [],
    ];

    brewing_write_cache_file('olbrygging-catalog.json', $payload);
    return $payload;
}

function brewing_split_substitution_values(string $value): array {
    $parts = preg_split('/[,\/]+/', $value) ?: [];
    $items = [];
    foreach ($parts as $part) {
        $clean = trim($part);
        if ($clean !== '') {
            $items[] = $clean;
        }
    }
    return array_values(array_unique($items));
}

function brewing_fetch_hopdatabase_catalog(): array {
    $cached = brewing_read_cache_file('hopdatabase-catalog.json', 24 * 60 * 60);
    if ($cached !== null) {
        return $cached;
    }

    $response = brewing_http_text(
        'https://raw.githubusercontent.com/kasperg3/HopDatabase/main/hop_database/data/hopsteiner_raw_data.json',
        ['Accept: application/json']
    );
    if (!$response['ok']) {
        return [
            'updatedAt' => gmdate(DATE_ATOM),
            'hops' => [],
        ];
    }

    $decoded = json_decode($response['body'] ?: '', true);
    $hops = [];
    foreach ((array)($decoded['hops'] ?? []) as $item) {
        if (!is_array($item)) continue;
        $name = trim((string)($item['name'] ?? ''));
        if ($name === '') continue;
        $hops[] = [
            'name' => $name,
            'key' => brewing_normalize_token($name),
            'alphaLow' => isset($item['acid_alpha_low']) ? (float)$item['acid_alpha_low'] : null,
            'alphaHigh' => isset($item['acid_alpha_high']) ? (float)$item['acid_alpha_high'] : null,
            'country' => (string)($item['main_country'] ?? ''),
            'aroma' => (string)($item['aroma_spec'] ?? ''),
            'brewhouse' => brewing_split_substitution_values((string)($item['brewhouse'] ?? '')),
            'dryHopping' => brewing_split_substitution_values((string)($item['dry_hopping'] ?? '')),
            'url' => 'https://github.com/kasperg3/HopDatabase',
        ];
    }

    $payload = [
        'updatedAt' => gmdate(DATE_ATOM),
        'hops' => $hops,
    ];
    brewing_write_cache_file('hopdatabase-catalog.json', $payload);
    return $payload;
}

function brewing_recipe_catalogs(): array {
    return [
        'shop' => brewing_fetch_olbrygging_catalog(),
        'hopDatabase' => brewing_fetch_hopdatabase_catalog(),
    ];
}

function brewing_reference_match_score(string $query, string $haystack): int {
    $queryKey = brewing_normalize_token($query);
    $haystackKey = brewing_normalize_token($haystack);
    if ($queryKey === '' || $haystackKey === '') return 0;
    if ($queryKey === $haystackKey) return 100;
    if (strpos($haystackKey, $queryKey) !== false) return 80;
    if (strpos($queryKey, $haystackKey) !== false) return 60;

    $needles = explode(' ', $queryKey);
    $score = 0;
    foreach ($needles as $needle) {
        if ($needle !== '' && strpos($haystackKey, $needle) !== false) {
            $score += 10;
        }
    }
    return $score;
}

function brewing_fetch_olbrygging_references(string $query): array {
    $query = trim($query);
    if ($query === '') return [];

    $catalog = brewing_fetch_olbrygging_catalog();
    $items = array_merge((array)($catalog['malts'] ?? []), (array)($catalog['hops'] ?? []));
    usort($items, static function ($a, $b) use ($query) {
        $aScore = brewing_reference_match_score($query, (string)($a['name'] ?? ''));
        $bScore = brewing_reference_match_score($query, (string)($b['name'] ?? ''));
        return $bScore <=> $aScore;
    });

    $references = [];
    foreach (array_slice($items, 0, 6) as $item) {
        $score = brewing_reference_match_score($query, (string)($item['name'] ?? ''));
        if ($score <= 0) continue;
        $subtitleBits = [];
        if (($item['kind'] ?? '') === 'malt' && $item['ebcLow'] !== null) {
            $subtitleBits[] = 'Malt';
            $subtitleBits[] = (($item['ebcLow'] === $item['ebcHigh']) ? $item['ebcLow'] : ($item['ebcLow'] . '-' . $item['ebcHigh'])) . ' EBC';
        } elseif (($item['kind'] ?? '') === 'hop' && $item['alphaLow'] !== null) {
            $subtitleBits[] = 'Humle';
            $subtitleBits[] = (($item['alphaLow'] === $item['alphaHigh']) ? $item['alphaLow'] : ($item['alphaLow'] . '-' . $item['alphaHigh'])) . '% AA';
        }

        $references[] = [
            'provider' => 'Ølbrygging',
            'title' => (string)($item['name'] ?? 'Råvare'),
            'subtitle' => implode(' · ', $subtitleBits),
            'url' => (string)($item['url'] ?? ''),
            'description' => ($item['kind'] ?? '') === 'malt'
                ? 'Butikkatalogtreff for malt som kan brukes i oppskriftsmatchingen og som innkjøpsforslag.'
                : 'Butikkatalogtreff for humle som kan brukes i oppskriftsmatchingen og som innkjøpsforslag.',
            'meta' => [
                'kind' => $item['kind'] ?? null,
                'variants' => $item['variants'] ?? [],
            ],
        ];
    }

    return $references;
}

function brewing_fetch_hopdatabase_references(string $query): array {
    $query = trim($query);
    if ($query === '') return [];

    $catalog = brewing_fetch_hopdatabase_catalog();
    $hops = (array)($catalog['hops'] ?? []);
    usort($hops, static function ($a, $b) use ($query) {
        return brewing_reference_match_score($query, (string)($b['name'] ?? ''))
            <=> brewing_reference_match_score($query, (string)($a['name'] ?? ''));
    });

    $references = [];
    foreach (array_slice($hops, 0, 4) as $hop) {
        $score = brewing_reference_match_score($query, (string)($hop['name'] ?? ''));
        if ($score <= 0) continue;

        $alpha = '';
        if ($hop['alphaLow'] !== null) {
            $alpha = (($hop['alphaLow'] === $hop['alphaHigh']) ? $hop['alphaLow'] : ($hop['alphaLow'] . '-' . $hop['alphaHigh'])) . '% AA';
        }

        $references[] = [
            'provider' => 'HopDatabase',
            'title' => (string)($hop['name'] ?? 'Humle'),
            'subtitle' => trim($alpha . ' · ' . (string)($hop['aroma'] ?? '')),
            'url' => (string)($hop['url'] ?? 'https://github.com/kasperg3/HopDatabase'),
            'description' => trim((string)($hop['aroma'] ?? '')),
            'meta' => [
                'country' => $hop['country'] ?? null,
                'brewhouse' => $hop['brewhouse'] ?? [],
                'dryHopping' => $hop['dryHopping'] ?? [],
            ],
        ];
    }

    return $references;
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
            'description' => trim((string)(($item['street'] ?? '') . ' ' . ($item['postal_code'] ?? ''))),
            'meta' => [
                'kind' => 'Brewery',
                'breweryType' => $item['brewery_type'] ?? null,
                'state' => $item['state'] ?? null,
                'city' => $item['city'] ?? null,
                'country' => $item['country'] ?? null,
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
            'description' => trim((string)($item['description'] ?? '')),
            'meta' => [
                'kind' => 'Beer',
                'abv' => $item['abv'] ?? null,
                'ibu' => $item['ibu'] ?? null,
                'brewer' => $item['brewer']['name'] ?? null,
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
            'description' => trim((string)($item['description'] ?? ($item['short_description'] ?? ''))),
            'meta' => [
                'kind' => 'Brewer',
                'country' => $item['country'] ?? null,
            ],
        ];
    }

    return array_slice($entries, 0, 6);
}

function brewing_fetch_punk_references(string $query): array {
    $query = trim($query);
    if ($query === '') return [];

    $url = 'https://punkapi-alxiw.amvera.io/v3/beers?page=1&per_page=10&beer_name=' . rawurlencode($query);
    $response = brewing_http_json($url, ['Accept: application/json']);
    if (isset($response['_error'])) {
        return [];
    }

    $items = array_values((array)$response);
    $references = [];
    foreach (array_slice($items, 0, 6) as $item) {
        if (!is_array($item)) continue;
        $references[] = [
            'provider' => 'Punk API',
            'title' => (string)($item['name'] ?? 'Beer hit'),
            'subtitle' => trim((string)(($item['tagline'] ?? '') . ' · ' . ($item['first_brewed'] ?? ''))),
            'url' => isset($item['id']) ? ('https://punkapi-alxiw.amvera.io/v3/beers/' . rawurlencode((string)$item['id'])) : 'https://punkapi-alxiw.amvera.io/docs',
            'description' => (string)($item['description'] ?? ''),
            'meta' => [
                'kind' => 'Beer Recipe',
                'abv' => $item['abv'] ?? null,
                'ibu' => $item['ibu'] ?? null,
                'ebc' => $item['ebc'] ?? null,
                'og' => $item['target_og'] ?? null,
                'fg' => $item['target_fg'] ?? null,
                'ph' => $item['ph'] ?? null,
                'attenuation' => $item['attenuation_level'] ?? null,
                'volume' => $item['volume']['value'] ?? null,
                'boilVolume' => $item['boil_volume']['value'] ?? null,
                'malt' => array_map(static function ($malt) {
                    if (!is_array($malt)) return '';
                    $amount = $malt['amount']['value'] ?? null;
                    $unit = $malt['amount']['unit'] ?? '';
                    return trim((string)($malt['name'] ?? '') . ($amount !== null ? (' ' . $amount . ' ' . $unit) : ''));
                }, (array)($item['ingredients']['malt'] ?? [])),
                'hops' => array_map(static function ($hop) {
                    if (!is_array($hop)) return '';
                    $amount = $hop['amount']['value'] ?? null;
                    $unit = $hop['amount']['unit'] ?? '';
                    $add = $hop['add'] ?? '';
                    return trim((string)($hop['name'] ?? '') . ($amount !== null ? (' ' . $amount . ' ' . $unit) : '') . ($add !== '' ? (' · ' . $add) : ''));
                }, (array)($item['ingredients']['hops'] ?? [])),
                'yeast' => $item['ingredients']['yeast'] ?? null,
                'mashTemp' => $item['method']['mash_temp'][0]['temp']['value'] ?? null,
                'mashDuration' => $item['method']['mash_temp'][0]['duration'] ?? null,
                'fermentationTemp' => $item['method']['fermentation']['temp']['value'] ?? null,
                'brewersTips' => $item['brewers_tips'] ?? null,
                'foodPairing' => $item['food_pairing'] ?? [],
            ],
        ];
    }

    return $references;
}

function brewing_fetch_tapline_references(string $query): array {
    if (trim($query) === '') return [];

    return [
        [
            'provider' => 'Tapline',
            'title' => 'Tapline bryggeverktøy',
            'subtitle' => 'Offentlige kalkulatorer for farge, varighet og oppskriftskonvertering.',
            'url' => 'https://api.malt.io/',
            'description' => 'Nyttig som oppslagskort for konvertering, bryggekalkyler og referanseverdier når vi vil sammenligne eller bygge videre pa en oppskrift.',
            'meta' => [
                'kind' => 'Tool',
                'docs' => 'https://github.com/homebrewing/tapline/blob/master/apidoc.md',
            ],
        ],
    ];
}

function brewing_storage_recommendations(): array {
    $config = brewing_read_storage_config();
    $shareUrl = trim((string)($config['googleDrive']['shareUrl'] ?? ''));
    $folderId = trim((string)($config['googleDrive']['folderId'] ?? ''));
    $folderLabel = trim((string)($config['googleDrive']['folderLabel'] ?? ''));
    $configured = $shareUrl !== '' || $folderId !== '';
    $defaultMode = brewing_normalize_storage_mode($config['defaultMode'] ?? 'local');

    return [
        [
            'id' => 'google-drive',
            'label' => 'Google Drive',
            'recommended' => true,
            'summary' => $configured && $folderLabel !== ''
                ? ('Delt bibliotek: ' . $folderLabel . '. Passer godt for bildegallerier og ferdige loggmapper nar serverplass skal spares.')
                : 'Passer godt for bildegallerier og ferdige loggmapper nar serverplass skal spares.',
            'status' => $configured ? 'konfigurert' : 'klar for oppsett',
            'shareUrl' => $shareUrl !== '' ? $shareUrl : null,
            'defaultMode' => $defaultMode,
        ],
        [
            'id' => 'server-local',
            'label' => 'Lokal serverlagring',
            'recommended' => false,
            'summary' => 'Raskest å vise direkte, men bruker egen diskplass og passer best til små batcher.',
            'status' => 'aktiv',
            'defaultMode' => $defaultMode,
        ],
    ];
}
