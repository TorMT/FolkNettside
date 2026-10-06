"""Regenerate deterministic, synthetic fixtures using only Python's stdlib."""
import json
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'tests/fixtures'
OUT.mkdir(parents=True, exist_ok=True)


def text(name, value):
    (OUT / name).write_text(value, encoding='utf-8')


def package(name, parts):
    with zipfile.ZipFile(OUT / name, 'w', zipfile.ZIP_DEFLATED) as archive:
        for path, content in sorted(parts.items()):
            info = zipfile.ZipInfo(path, (2020, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            archive.writestr(info, content.encode())


def office(name, main, content_type, parts, overrides=()):
    types = '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>'
    for path, kind in [(main, content_type), *overrides]:
        types += f'<Override PartName="/{path}" ContentType="{kind}"/>'
    parts['[Content_Types].xml'] = types + '</Types>'
    parts['_rels/.rels'] = f'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="{main}"/></Relationships>'
    package(name, parts)


# A valid one-page PDF with calculated xref offsets.
stream = b'BT /F1 18 Tf 30 70 Td (FolkNettside staging fixture) Tj ET'
objects = [b'<< /Type /Catalog /Pages 2 0 R >>', b'<< /Type /Pages /Kids [3 0 R] /Count 1 >>', b'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 360 120] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>', b'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>', b'<< /Length ' + str(len(stream)).encode() + b' >>\nstream\n' + stream + b'\nendstream']
pdf = b'%PDF-1.4\n'
offsets = [0]
for i, obj in enumerate(objects, 1):
    offsets.append(len(pdf))
    pdf += f'{i} 0 obj\n'.encode() + obj + b'\nendobj\n'
xref = len(pdf)
pdf += b'xref\n0 6\n0000000000 65535 f \n' + b''.join(f'{offset:010d} 00000 n \n'.encode() for offset in offsets[1:])
pdf += f'trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n'.encode()
(OUT / 'sample.pdf').write_bytes(pdf)
text('sample.py', '"""Synthetic staging example."""\nprint(2 + 2)\n')
text('sample.txt', 'FolkNettside synthetic staging fixture.\n')
text('sample.csv', 'name,value\nfixture,4\n')
text('sample.tex', '\\documentclass{article}\n\\begin{document}\nFixture: $2+2=4$.\n\\end{document}\n')
text('sample.html', '<!doctype html><html><head><title>HTML fixture</title></head><body><h1>HTML fixture</h1></body></html>')
text('sample.ipynb', json.dumps({'cells': [{'cell_type': 'code', 'execution_count': 1, 'metadata': {}, 'outputs': [{'output_type': 'stream', 'name': 'stdout', 'text': ['4\n']}], 'source': ['print(2+2)']}], 'metadata': {'kernelspec': {'display_name': 'Python 3', 'language': 'python', 'name': 'python3'}}, 'nbformat': 4, 'nbformat_minor': 5}))
# Closed tetrahedron, not a zero-volume triangle.
vertices = [(0, 0, 0), (1, 0, 0), (0, 1, 0), (0, 0, 1)]
faces = [(0, 2, 1), (0, 1, 3), (0, 3, 2), (1, 2, 3)]
stl = 'solid fixture\n'
for face in faces:
    stl += 'facet normal 0 0 0\nouter loop\n' + ''.join('vertex %s %s %s\n' % vertices[i] for i in face) + 'endloop\nendfacet\n'
text('sample.stl', stl + 'endsolid fixture\n')
model = '<model unit="meter" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02"><resources><object id="1" type="model"><mesh><vertices>' + ''.join(f'<vertex x="{x}" y="{y}" z="{z}"/>' for x,y,z in vertices) + '</vertices><triangles>' + ''.join(f'<triangle v1="{a}" v2="{b}" v3="{c}"/>' for a,b,c in faces) + '</triangles></mesh></object></resources><build><item objectid="1"/></build></model>'
package('sample.3mf', {'[Content_Types].xml': '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/></Types>', '_rels/.rels': '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="r1" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel" Target="/3D/3dmodel.model"/></Relationships>', '3D/3dmodel.model': model})
office('sample.docx', 'word/document.xml', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml', {'word/document.xml': '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>FolkNettside staging fixture</w:t></w:r></w:p><w:sectPr/></w:body></w:document>'})
office('sample.xlsx', 'xl/workbook.xml', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml', {
    'xl/workbook.xml': '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Fixture" sheetId="1" r:id="rId1"/></sheets></workbook>',
    'xl/_rels/workbook.xml.rels': '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>',
    'xl/worksheets/sheet1.xml': '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>Fixture</t></is></c><c r="B1"><v>4</v></c></row></sheetData></worksheet>'
}, [('xl/worksheets/sheet1.xml', 'application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml')])
# Presentation with one slide and proper slide-layout/master/theme relationships.
rel_ns = 'http://schemas.openxmlformats.org/package/2006/relationships'
rel_type = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/'
def rels(items):
    return f'<Relationships xmlns="{rel_ns}">' + ''.join(f'<Relationship Id="rId{i}" Type="{rel_type}{kind}" Target="{target}"/>' for i,kind,target in items) + '</Relationships>'
p_ns = 'xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"'
group = '<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>'
shape = '<p:sp><p:nvSpPr><p:cNvPr id="2" name="Fixture"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="914400" y="914400"/><a:ext cx="7315200" cy="914400"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr><p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr lang="en-US"/><a:t>FolkNettside staging fixture</a:t></a:r></a:p></p:txBody></p:sp>'
parts = {
    'ppt/presentation.xml': f'<p:presentation {p_ns}><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId2"/></p:sldMasterIdLst><p:sldIdLst><p:sldId id="256" r:id="rId1"/></p:sldIdLst><p:sldSz cx="9144000" cy="6858000"/><p:notesSz cx="6858000" cy="9144000"/></p:presentation>',
    'ppt/_rels/presentation.xml.rels': rels([(1,'slide','slides/slide1.xml'),(2,'slideMaster','slideMasters/slideMaster1.xml')]),
    'ppt/slides/slide1.xml': f'<p:sld {p_ns}><p:cSld><p:spTree>{group}{shape}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>',
    'ppt/slides/_rels/slide1.xml.rels': rels([(1,'slideLayout','../slideLayouts/slideLayout1.xml')]),
    'ppt/slideLayouts/slideLayout1.xml': f'<p:sldLayout {p_ns} type="blank" preserve="1"><p:cSld><p:spTree>{group}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>',
    'ppt/slideLayouts/_rels/slideLayout1.xml.rels': rels([(1,'slideMaster','../slideMasters/slideMaster1.xml')]),
    'ppt/slideMasters/slideMaster1.xml': f'<p:sldMaster {p_ns}><p:cSld><p:spTree>{group}</p:spTree></p:cSld><p:clrMap accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" bg1="lt1" bg2="lt2" folHlink="folHlink" hlink="hlink" tx1="dk1" tx2="dk2"/><p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst><p:txStyles><p:titleStyle/><p:bodyStyle/><p:otherStyle/></p:txStyles></p:sldMaster>',
    'ppt/slideMasters/_rels/slideMaster1.xml.rels': rels([(1,'slideLayout','../slideLayouts/slideLayout1.xml'),(2,'theme','../theme/theme1.xml')]),
    'ppt/theme/theme1.xml': '<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Fixture"><a:themeElements><a:clrScheme name="Fixture">' + ''.join(f'<a:{key}><a:srgbClr val="{color}"/></a:{key}>' for key,color in [('dk1','000000'),('lt1','FFFFFF'),('dk2','222222'),('lt2','EEEEEE'),('accent1','004F9F'),('accent2','008000'),('accent3','FF0000'),('accent4','FFFF00'),('accent5','00FFFF'),('accent6','FF00FF'),('hlink','0000FF'),('folHlink','800080')]) + '</a:clrScheme><a:fontScheme name="Fixture"><a:majorFont><a:latin typeface="Arial"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont><a:minorFont><a:latin typeface="Arial"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont></a:fontScheme><a:fmtScheme name="Fixture"><a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst><a:lnStyleLst><a:ln w="9525"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/></a:ln><a:ln w="9525"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/></a:ln><a:ln w="9525"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/></a:ln></a:lnStyleLst><a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst><a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst></a:fmtScheme></a:themeElements></a:theme>'
}
overrides = [(p, 'application/vnd.openxmlformats-officedocument.presentationml.' + kind + '+xml') for p,kind in [('ppt/slides/slide1.xml','slide'),('ppt/slideLayouts/slideLayout1.xml','slideLayout'),('ppt/slideMasters/slideMaster1.xml','slideMaster')]]
overrides.append(('ppt/theme/theme1.xml','application/vnd.openxmlformats-officedocument.theme+xml'))
office('sample.pptx', 'ppt/presentation.xml', 'application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml', parts, overrides)
text('quiz.json', json.dumps({'title': 'Fixture quiz', 'select': 1, 'questions': [{'id':'fixture-1','type':'single','text':'2 + 2?', 'options':['3','4'], 'answer':[1], 'explanation':'Two plus two equals four.'}]}))
text('aps-config.json', json.dumps({'title':'APS staging','subtitle':'Synthetic catalog; no live credentials','mode':'demo'}))
print(f'Generated {len(list(OUT.iterdir()))} fixtures; {sum(p.stat().st_size for p in OUT.iterdir() if p.is_file()):,} bytes')
