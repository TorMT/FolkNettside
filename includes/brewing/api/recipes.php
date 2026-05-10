<?php
require __DIR__ . '/providers.php';

$query = trim((string)($_GET['ingredients'] ?? $_GET['q'] ?? ''));
$id = trim((string)($_GET['id'] ?? ''));

$localRecipes = brewing_read_local_recipes($query);
$brewfatherRecipes = brewing_fetch_brewfather_recipes($query);
$recipes = array_merge($localRecipes, $brewfatherRecipes);

if ($id !== '') {
    foreach ($recipes as $recipe) {
        if ((string)($recipe['id'] ?? '') === $id || (string)($recipe['slug'] ?? '') === $id) {
            brewing_json_response([
                'providers' => brewing_provider_statuses(),
                'recipe' => $recipe,
            ]);
        }
    }

    brewing_error('Recipe not found.', 404);
}

brewing_json_response([
    'providers' => brewing_provider_statuses(),
    'query' => $query,
    'count' => count($recipes),
    'recipes' => $recipes,
]);
