from pathlib import Path
from html.parser import HTMLParser
import re,json
ROOT=Path(__file__).resolve().parents[1]/'release/matteverkstedet'
class Links(HTMLParser):
 def __init__(self):super().__init__();self.links=[]
 def handle_starttag(self,tag,attrs):
  self.links += [v for k,v in attrs if k in ['src','href'] and v and not v.startswith(('http:','https:','#','data:'))]
count=0
for i in range(1,5):
 p=ROOT/f'matte{i}'
 h=Links();h.feed((p/'index.html').read_text())
 for link in h.links:assert (p/link.split('#')[0]).exists(),link;count+=1
 for link in re.findall(r'url\(([^)]+)\)',(p/'vendor/katex.min.css').read_text()):assert (p/'vendor'/link.strip('"\'')).exists(),link;count+=1
 sw=(p/'sw.js').read_text();files=json.loads(sw.split('const FILES=')[1].split(';\n')[0])
 for f in files:assert (p/f).exists(),f;count+=1
 m=json.loads((p/'manifest.webmanifest').read_text());assert (p/m['start_url']).exists()
print(f'{count} lokale filreferanser kontrollert; alle finnes.')
