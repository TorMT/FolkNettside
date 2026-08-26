<?php
require __DIR__ . '/common.php';

$sourceUrl = karakterweb_normalize_url($_GET['url'] ?? '');
$remoteHtml = karakterweb_fetch_remote_html($sourceUrl);
$dom = karakterweb_load_dom($remoteHtml);
$xpath = new DOMXPath($dom);

$pageGrid = karakterweb_query_first($xpath, '//*[contains(@class,"page-styles__PageGrid")]');
$chartCard = karakterweb_query_first($xpath, '//*[contains(@class,"page-styles__ChartCard")]');
$evaluationCard = karakterweb_query_first($xpath, '//*[contains(@class,"page-styles__EvaluationCard")]');
$headerBlock = karakterweb_query_first($xpath, '//*[contains(@class,"page-styles__HeaderBlock")]');
$pageWrapper = karakterweb_query_first($xpath, '//*[contains(@class,"page-styles__PageWrapper")]');

if (!($pageGrid instanceof DOMElement)) {
    karakterweb_render_error_page(
        'Karakterweb i inview',
        'Kunne ikke lese Karakterweb-innholdet i det nye sideformatet.',
        $sourceUrl,
        502
    );
}

$chartSlot = karakterweb_query_first($xpath, '//*[@id="S:0"]');
$evaluationSlot = karakterweb_query_first($xpath, '//*[@id="S:1"]');
$chartHtml = trim(karakterweb_inner_html($chartSlot));
$evaluationHtml = trim(karakterweb_inner_html($evaluationSlot));

// Newer Karakterweb responses can omit the streamed slot ids. Keep the
// server-rendered card content instead of showing an empty inview.
if ($chartHtml === '' && $chartCard instanceof DOMElement) {
    $chartHtml = trim(karakterweb_inner_html($chartCard));
}
if ($evaluationHtml === '' && $evaluationCard instanceof DOMElement) {
    $evaluationHtml = trim(karakterweb_inner_html($evaluationCard));
}

if ($chartHtml === '') {
    $chartHtml = '<div class="kw-inview-empty"><p>Fant ingen karakterdata i Karakterweb-svaret.</p></div>';
}
if ($evaluationHtml === '') {
    $evaluationHtml = '<div class="kw-inview-empty"><p>Fant ingen studentvurderinger i Karakterweb-svaret.</p></div>';
}

if ($chartCard instanceof DOMElement) {
    karakterweb_replace_children($chartCard, $chartHtml);
}
if ($evaluationCard instanceof DOMElement) {
    karakterweb_replace_children($evaluationCard, $evaluationHtml);
}

$bannerHtml = '<div class="kw-inview-banner">'
    . '<strong>Karakterweb i inview.</strong> Denne visningen rendres lokalt fordi Karakterweb blokkerer direkte iframe-embedding. '
    . '<a href="' . karakterweb_escape_html($sourceUrl) . '" target="_blank" rel="noopener">Apne originalen</a> for full interaksjon.'
    . '</div>';

if ($headerBlock) {
    karakterweb_insert_after($headerBlock, $bannerHtml);
} elseif ($pageGrid->firstChild) {
    karakterweb_insert_after($pageGrid->firstChild, $bannerHtml);
} else {
    foreach (karakterweb_fragment_nodes($dom, $bannerHtml) as $node) {
        $pageGrid->appendChild($node);
    }
}

$headerHtml = karakterweb_node_html(karakterweb_query_first($xpath, '//header[1]'));
$footerHtml = karakterweb_node_html(karakterweb_query_first($xpath, '//footer[1]'));
$pageGridHtml = karakterweb_node_html($pageGrid);
$pageWrapperClass = '';
if ($pageWrapper instanceof DOMElement) {
    $pageWrapperClass = trim((string)$pageWrapper->getAttribute('class'));
}

$htmlClass = '';
$htmlNode = karakterweb_query_first($xpath, '/html');
if ($htmlNode instanceof DOMElement) {
    $htmlClass = trim((string)$htmlNode->getAttribute('class'));
}

$titleNode = karakterweb_query_first($xpath, '//title[1]');
$title = trim((string)($titleNode ? $titleNode->textContent : 'Karakterweb i inview'));
$stylesHtml = karakterweb_collect_head_styles($xpath);
$pageWrapperAttr = $pageWrapperClass !== '' ? ' class="' . karakterweb_escape_html($pageWrapperClass) . '"' : '';
$htmlClassAttr = $htmlClass !== '' ? ' class="' . karakterweb_escape_html($htmlClass) . '"' : '';

karakterweb_html_response(
    '<!DOCTYPE html><html lang="no"' . $htmlClassAttr . '><head>'
    . '<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">'
    . '<title>' . karakterweb_escape_html($title) . '</title>'
    . '<base href="https://karakterweb.no/" target="_blank">'
    . $stylesHtml
    . '<style>'
    . 'body{margin:0;padding:0;}'
    . '.kw-inview-banner{grid-column:1 / -1;margin:.25rem 0 1rem;padding:.95rem 1rem;border:1px solid rgba(15,94,168,.16);border-radius:14px;background:rgba(15,94,168,.07);color:#13324d;font:600 .95rem/1.5 system-ui,sans-serif;}'
    . '.kw-inview-banner a{color:#0f5ea8;text-decoration:none;}'
    . '.kw-inview-banner a:hover{text-decoration:underline;}'
    . '.kw-inview-empty{font:500 1rem/1.5 system-ui,sans-serif;color:#475569;padding:.25rem 0;}'
    . '.kw-inview-static button,.kw-inview-static input,.kw-inview-static select{pointer-events:none;}'
    . '.kw-inview-static .grade-charts__HelpButton-sc-bd1e3a3c-4{display:none;}'
    . '</style></head><body class="kw-inview-static">'
    . $headerHtml
    . '<main><div' . $pageWrapperAttr . '>' . $pageGridHtml . '</div></main>'
    . $footerHtml
    . '</body></html>'
);
