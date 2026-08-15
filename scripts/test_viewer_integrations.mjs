import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const readRepoFile = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const [template, generator, sidebar, htmlViewer] = await Promise.all([
  readRepoFile('course-template.html'),
  readRepoFile('navbarupdater.py'),
  readRepoFile('includes/sidebar-loader.js'),
  readRepoFile('includes/kodeLesere/htmlview.html'),
]);

for (const [name, source] of [['course template', template], ['course generator', generator]]) {
  assert.match(source, /https:\/\/karakterweb\.no\/ntnu\/\{course_code\}/, `${name} should use the canonical Karakterweb URL`);
  assert.doesNotMatch(source, /https:\/\/www\.karakterweb\.no/, `${name} must not restore the obsolete www host`);
}

assert.match(sidebar, /ev\.origin !== location\.origin/, 'viewer status messages must be same-origin');
assert.match(sidebar, /ev\.source !== viewerWindow/, 'viewer status messages must come from the active viewer');
assert.match(htmlViewer, /resolved\.protocol !== 'http:' && resolved\.protocol !== 'https:'/, 'HTML viewer must reject active URL schemes');
assert.match(htmlViewer, /id="open-external"/, 'external embeds should offer a new-tab fallback');

console.log('Viewer integration regression checks passed.');
