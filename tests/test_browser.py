"""Real browser checks against the exported project-path site, not source HTML.

Office's public HTTPS renderer and authenticated third-party services are
deliberately verified only up to their integration boundary on localhost.
"""
import json
import os
import sys
import threading
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from serve_export import server


def main():
    out = ROOT / 'export'
    httpd = server(out, 0)
    thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    thread.start()
    base = json.loads((out / 'deployment/build.json').read_text())['basePath']
    origin = f'http://127.0.0.1:{httpd.server_port}'
    site = origin + base
    try:
        with sync_playwright() as playwright:
            options = {'headless': True, 'args': ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']}
            if os.environ.get('BROWSER_EXECUTABLE'):
                options['executable_path'] = os.environ['BROWSER_EXECUTABLE']
            browser = playwright.chromium.launch(**options)
            page = browser.new_page()
            errors = []
            missing = []
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.on('response', lambda response: missing.append(response.url) if response.status >= 400 and response.url.startswith(origin) else None)
            page.goto(site + '/')
            page.wait_for_selector('nav.navbar')
            assert page.locator('h1').inner_text()
            assert page.locator('a[href="' + base + '/preview/"]').count()
            print('PASS home/navigation at project path')

            page.goto(site + '/includes/kodeLesere/codeview.html?asset=txt')
            page.wait_for_function("document.querySelector('#code').textContent.includes('synthetic staging')")
            print('PASS text viewer loads mapped fixture')

            page.goto(site + '/includes/kodeLesere/pdfview.html?asset=pdf')
            assert page.locator('#frame').get_attribute('src') == base + '/preview/files/sample.pdf'
            response = page.request.get(site + '/preview/files/sample.pdf')
            assert response.ok and response.body().startswith(b'%PDF-')
            print('PASS PDF viewer frame and valid PDF response')

            for kind in ['stl', '3mf']:
                page.goto(site + '/includes/kodeLesere/stlview.html?asset=' + kind)
                page.wait_for_selector('canvas')
                # Exercise the production loader and verify geometry, not just
                # the existence of an empty WebGL canvas.
                count = page.evaluate('''async () => {
                  const {ModelLoader} = await import(SiteDeployment.basePath + '/includes/three/ModelLoader.js');
                  const result = await new ModelLoader().load(SiteAssets.resolve(new URL(location.href).searchParams.get('asset')));
                  const root = result.object || result.mesh || result;
                  let vertices = 0;
                  root.traverse(node => { vertices += node.geometry?.attributes?.position?.count || 0; });
                  return vertices;
                }''')
                assert count >= 12, f'{kind}: no tetrahedron geometry: {count}'
                print(f'PASS {kind} viewer and real model loader ({count} vertices)')

            for kind in ['docx', 'xlsx', 'pptx']:
                # Do not wait for Microsoft's renderer, which cannot fetch localhost.
                page.goto(site + '/includes/kodeLesere/officeview.html?asset=' + kind, wait_until='domcontentloaded')
                embed = page.locator('iframe').get_attribute('src')
                assert embed.startswith('https://view.officeapps.live.com/op/embed.aspx?src=')
                assert page.request.get(site + '/preview/files/sample.' + kind).ok
                print(f'PASS {kind} Office integration URL and fixture download')

            page.goto(site + '/includes/kodeLesere/csvview.html?asset=csv')
            page.wait_for_function("document.querySelector('#tbody').textContent.includes('fixture')")
            print('PASS CSV table parsing')

            page.goto(site + '/includes/kodeLesere/aps-viewer.html?asset=aps')
            page.wait_for_selector('.aps-model-button')
            assert 'Fixture model' in page.locator('#aps-model-list').inner_text()
            print('PASS APS config and model catalog with synthetic API response')

            page.goto(site + '/preview/course/')
            page.wait_for_selector('#sidebar a[href*="sample"]', state='attached')
            assert page.locator('#sidebar').inner_text()
            page.locator('#sidebar .dropdown-btn').filter(has_text='Testfiler').hover()
            page.locator('#sidebar a[href$="sample.html"]').click()
            page.wait_for_function("Array.from(document.querySelectorAll('iframe,object')).some(f => (f.src || f.data || '').includes('htmlview.html'))")
            page.locator('#quiz-btn').click()
            page.wait_for_function("document.querySelector('#quiz-container').textContent.includes('2 + 2?')")
            result = page.evaluate('''async () => {
              const response = await fetch(SiteDeployment.basePath + '/Quiz/leaderboard.php');
              return {ok: response.ok, fixture: response.headers.get('X-Staging-Fixture'), body: await response.json()};
            }''')
            assert result['ok'] and result['fixture'] == 'true' and result['body']['staging']
            quiz = page.request.get(site + '/preview/quiz.json').json()
            assert quiz['questions'][0]['answer'] == [1]
            print('PASS course sidebar, quiz data and fixture API boundary')
            assert not errors, '\n'.join(errors)
            assert not missing, '\n'.join(missing)
            print('PASS no JavaScript exceptions or failed local requests')
            browser.close()
    finally:
        httpd.shutdown()
        httpd.server_close()


if __name__ == '__main__':
    main()
