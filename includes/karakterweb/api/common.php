<?php
function karakterweb_html_response(string $html, int $code = 200): void {
    http_response_code($code);
    header('Content-Type: text/html; charset=utf-8');
    header('Cache-Control: no-store, max-age=0');
    echo $html;
    exit;
}

function karakterweb_escape_html(string $value): string {
    return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function karakterweb_render_error_page(string $title, string $message, string $sourceUrl = '', int $code = 502): void {
    $safeTitle = karakterweb_escape_html($title);
    $safeMessage = karakterweb_escape_html($message);
    $safeSourceUrl = $sourceUrl !== '' ? karakterweb_escape_html($sourceUrl) : '';
    $linkHtml = $safeSourceUrl !== ''
        ? '<p><a href="' . $safeSourceUrl . '" target="_blank" rel="noopener">Apne originalen hos Karakterweb</a></p>'
        : '';

    karakterweb_html_response(
        '<!DOCTYPE html><html lang="no"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">'
        . '<title>' . $safeTitle . '</title><style>'
        . 'html,body{margin:0;padding:0;min-height:100%;background:#f4f1ea;color:#1f2937;font:16px/1.5 system-ui,sans-serif;}'
        . '.wrap{max-width:52rem;margin:0 auto;padding:2rem 1rem 3rem;}'
        . '.card{background:#fff;border:1px solid #d7d2c8;border-radius:18px;padding:1.25rem 1.25rem 1rem;box-shadow:0 12px 28px rgba(15,23,42,.08);}'
        . 'h1{margin:0 0 .75rem;font-size:1.3rem;}p{margin:.65rem 0;}a{color:#0f5ea8;text-decoration:none;font-weight:600;}a:hover{text-decoration:underline;}'
        . '</style></head><body><div class="wrap"><div class="card"><h1>' . $safeTitle . '</h1><p>' . $safeMessage . '</p>' . $linkHtml . '</div></div></body></html>',
        $code
    );
}

function karakterweb_extract_nested_value(string $raw, int $depth = 0): string {
    $value = trim(html_entity_decode($raw, ENT_QUOTES | ENT_HTML5, 'UTF-8'), " \t\n\r\0\x0B\"'");
    if ($value === '' || $depth > 5) {
        return $value;
    }

    $parts = parse_url($value);
    if (is_array($parts) && !empty($parts['query'])) {
        parse_str((string)$parts['query'], $query);
        foreach (['url', 'file'] as $key) {
            $candidate = trim((string)($query[$key] ?? ''));
            if ($candidate !== '' && $candidate !== $value) {
                return karakterweb_extract_nested_value($candidate, $depth + 1);
            }
        }
    }

    $decoded = rawurldecode($value);
    if ($decoded !== $value) {
        return karakterweb_extract_nested_value($decoded, $depth + 1);
    }

    return $value;
}

function karakterweb_normalize_url(?string $input): string {
    $raw = karakterweb_extract_nested_value((string)($input ?? ''));
    if ($raw === '') {
        karakterweb_render_error_page('Karakterweb i inview', 'Mangler URL til Karakterweb-siden.', '', 400);
    }

    if (!preg_match('~^https?://~i', $raw)) {
        if (preg_match('~^/[a-z0-9-]+/(?:[a-z0-9._~%-]|%[0-9a-f]{2})+/?$~i', $raw)) {
            $raw = 'https://karakterweb.no' . $raw;
        } else {
            $raw = 'https://karakterweb.no/' . ltrim($raw, '/');
        }
    }

    $parts = parse_url($raw);
    if (!is_array($parts)) {
        karakterweb_render_error_page('Karakterweb i inview', 'Ugyldig Karakterweb-URL.', $raw, 400);
    }

    $host = strtolower((string)($parts['host'] ?? ''));
    if (!in_array($host, ['karakterweb.no', 'www.karakterweb.no'], true)) {
        karakterweb_render_error_page('Karakterweb i inview', 'Denne inview-rendereren tillater bare karakterweb.no.', $raw, 400);
    }

    $path = preg_replace('~/+~', '/', (string)($parts['path'] ?? '/')) ?: '/';
    if ($path === '/' || $path === '') {
        karakterweb_render_error_page('Karakterweb i inview', 'URL-en mangler sti til en Karakterweb-side.', $raw, 400);
    }

    $query = isset($parts['query']) && $parts['query'] !== '' ? '?' . $parts['query'] : '';
    return 'https://karakterweb.no' . rtrim($path, '/') . $query;
}

function karakterweb_fetch_remote_html(string $url): string {
    if (!function_exists('curl_init')) {
        karakterweb_render_error_page('Karakterweb i inview', 'PHP mangler cURL-stotte pa serveren.', $url, 500);
    }

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_TIMEOUT => 25,
        CURLOPT_ENCODING => '',
        CURLOPT_USERAGENT => 'FolkNettside Karakterweb Inview/1.0',
        CURLOPT_HTTPHEADER => [
            'Accept: text/html,application/xhtml+xml',
            'Accept-Language: nb-NO,nb;q=0.9,en;q=0.7',
        ],
    ]);

    $response = curl_exec($ch);
    $status = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    $error = curl_error($ch);
    curl_close($ch);

    if ($response === false) {
        karakterweb_render_error_page('Karakterweb i inview', 'Kunne ikke hente data fra Karakterweb: ' . $error, $url, 502);
    }

    if ($status >= 400) {
        karakterweb_render_error_page('Karakterweb i inview', 'Karakterweb svarte med HTTP ' . $status . '.', $url, $status);
    }

    return (string)$response;
}

function karakterweb_load_dom(string $html): DOMDocument {
    libxml_use_internal_errors(true);
    $dom = new DOMDocument();
    $dom->loadHTML('<?xml encoding="utf-8" ?>' . $html, LIBXML_NOERROR | LIBXML_NOWARNING);
    libxml_clear_errors();
    return $dom;
}

function karakterweb_query_first(DOMXPath $xpath, string $expr): ?DOMNode {
    $nodes = $xpath->query($expr);
    if (!$nodes || $nodes->length === 0) {
        return null;
    }
    return $nodes->item(0);
}

function karakterweb_node_html(?DOMNode $node): string {
    if (!$node || !$node->ownerDocument) {
        return '';
    }
    return (string)$node->ownerDocument->saveHTML($node);
}

function karakterweb_inner_html(?DOMNode $node): string {
    if (!$node || !$node->ownerDocument) {
        return '';
    }

    $html = '';
    foreach ($node->childNodes as $child) {
        $html .= $node->ownerDocument->saveHTML($child);
    }
    return $html;
}

function karakterweb_collect_head_styles(DOMXPath $xpath): string {
    $html = '';
    $nodes = $xpath->query('//head/link[@rel="stylesheet"] | //head/style');
    if (!$nodes) {
        return $html;
    }

    foreach ($nodes as $node) {
        if ($node instanceof DOMElement && strtolower($node->tagName) === 'link') {
            $href = trim((string)$node->getAttribute('href'));
            if ($href === '') continue;
            if (strpos($href, '//') === 0) {
                $href = 'https:' . $href;
            } elseif (!preg_match('~^https?://~i', $href)) {
                $href = 'https://karakterweb.no' . ($href[0] === '/' ? $href : '/' . $href);
            }
            $html .= '<link rel="stylesheet" href="' . karakterweb_escape_html($href) . '">' . "\n";
            continue;
        }
        $html .= karakterweb_node_html($node) . "\n";
    }

    return $html;
}

function karakterweb_fragment_nodes(DOMDocument $target, string $html): array {
    $tmp = new DOMDocument();
    libxml_use_internal_errors(true);
    $tmp->loadHTML('<?xml encoding="utf-8" ?><!DOCTYPE html><html><body><div data-karakterweb-wrap="1">' . $html . '</div></body></html>', LIBXML_NOERROR | LIBXML_NOWARNING);
    libxml_clear_errors();

    $body = $tmp->getElementsByTagName('body')->item(0);
    if (!$body) {
        return [];
    }

    $wrap = null;
    foreach ($body->childNodes as $child) {
        if ($child instanceof DOMElement && $child->getAttribute('data-karakterweb-wrap') === '1') {
            $wrap = $child;
            break;
        }
    }
    if (!$wrap) {
        return [];
    }

    $nodes = [];
    foreach ($wrap->childNodes as $child) {
        $nodes[] = $target->importNode($child, true);
    }
    return $nodes;
}

function karakterweb_replace_children(DOMElement $element, string $html): void {
    while ($element->firstChild) {
        $element->removeChild($element->firstChild);
    }

    foreach (karakterweb_fragment_nodes($element->ownerDocument, $html) as $node) {
        $element->appendChild($node);
    }
}

function karakterweb_insert_after(DOMNode $reference, string $html): void {
    $parent = $reference->parentNode;
    if (!$parent || !$reference->ownerDocument) {
        return;
    }

    $nextSibling = $reference->nextSibling;
    foreach (karakterweb_fragment_nodes($reference->ownerDocument, $html) as $node) {
        if ($nextSibling) {
            $parent->insertBefore($node, $nextSibling);
        } else {
            $parent->appendChild($node);
        }
    }
}
