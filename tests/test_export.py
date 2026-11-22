import hashlib
import contextlib
import io
import json
import subprocess
import sys
import unittest
import tempfile
from unittest.mock import patch
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from export_repo import ROOT as EXPORT_ROOT, build, rewrite_text, base_path
from check_export import check
import audit_repo


class ExportTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.pages = build('pages', ROOT / 'export-test-pages', '/FolkNettside')
        cls.ntnu = build('ntnu', ROOT / 'export-test-ntnu', '/~tormt')

    def test_pages_contract(self):
        self.assertFalse(check(self.pages))
        self.assertFalse(list(self.pages.rglob('*.php')))
        self.assertFalse(list(self.pages.rglob('*.pyc')))
        self.assertTrue((self.pages / 'Tools/Coolprop/coolprop.wasm').is_file())
        self.assertTrue((self.pages / 'jszip.min.js').is_file())
        self.assertTrue((self.pages / 'semestre/1/itgk/filer/index.json').is_file())

    def test_ntnu_has_code_not_fixtures_or_external_archive(self):
        self.assertTrue((self.ntnu / 'Quiz/leaderboard.php').is_file())
        self.assertFalse((self.ntnu / 'preview').exists())
        self.assertFalse((self.ntnu / 'preview/course').exists())
        self.assertIn('"target": "ntnu"', (self.ntnu / 'deployment/config.js').read_text())

    def test_rewrite_preserves_js_and_external_urls(self):
        source = "const sep='/'; const x='/includes/a.js'; const y='//cdn.test/a'; const z='https://test/assets/a'; const q='/FolkNettside/assets/a';"
        actual = rewrite_text(source, '/FolkNettside')
        self.assertIn("sep='/'", actual)
        self.assertIn("x='/FolkNettside/includes/a.js'", actual)
        self.assertIn("y='//cdn.test/a'", actual)
        self.assertIn("z='https://test/assets/a'", actual)
        self.assertEqual(actual.count('/FolkNettside/assets/a'), 1)
        self.assertEqual(rewrite_text(actual, '/FolkNettside'), actual)
        self.assertEqual(rewrite_text(source, ''), source)

    def test_refuses_unsafe_output(self):
        for output in [ROOT, ROOT / 'assets', ROOT.parent / 'export']:
            with self.assertRaises(ValueError):
                build(output=output)
        with self.assertRaises(ValueError):
            base_path('/../escape')

    def test_large_binary_and_fixture_guard_rejects_oversized_inputs(self):
        with tempfile.TemporaryDirectory(prefix='folk-size-guard-') as temporary:
            root = Path(temporary)
            (root / 'deployment').mkdir()
            (root / 'deployment/large-files.json').write_bytes((ROOT / 'deployment/large-files.json').read_bytes())
            (root / 'tests/fixtures').mkdir(parents=True)
            with (root / 'unexpected.wasm').open('wb') as stream:
                stream.truncate(6 * 1024 * 1024)
            with (root / 'tests/fixtures/oversized.pdf').open('wb') as stream:
                stream.truncate(250001)
            with patch.object(audit_repo, 'ROOT', root), patch.object(audit_repo.subprocess, 'check_output', return_value=b'unexpected.wasm\0tests/fixtures/oversized.pdf\0'), contextlib.redirect_stdout(io.StringIO()):
                _, errors = audit_repo.audit()
            self.assertEqual(len(errors), 2)

    def test_fixtures_are_valid_small_and_reproducible(self):
        fixtures = ROOT / 'tests/fixtures'
        before = {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in fixtures.iterdir() if p.is_file()}
        subprocess.run([sys.executable, '-B', str(ROOT / 'scripts/generate_fixtures.py')], check=True)
        after = {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in fixtures.iterdir() if p.is_file()}
        self.assertEqual(before, after)
        self.assertTrue((fixtures / 'sample.pdf').read_bytes().startswith(b'%PDF-'))
        for ext in ['docx', 'xlsx', 'pptx', '3mf']:
            path = fixtures / ('sample.' + ext)
            self.assertLess(path.stat().st_size, 250_000)
            with zipfile.ZipFile(path) as archive:
                self.assertIsNone(archive.testzip())
                for name in archive.namelist():
                    ET.fromstring(archive.read(name))


if __name__ == '__main__':
    unittest.main()
