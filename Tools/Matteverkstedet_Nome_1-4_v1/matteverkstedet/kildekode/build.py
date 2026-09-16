from pathlib import Path
import json, shutil, csv, zipfile
ROOT=Path(__file__).resolve().parent
src=ROOT/'dist';out=ROOT/'release'/'matteverkstedet';out.mkdir(parents=True,exist_ok=True)
raw=(src/'data.js').read_text();D=json.loads(raw[raw.index('=')+1:].strip().rstrip(';'))
D['globalLessonTitles']={m['id']:f'Matte {m["course"]}: {m["title"]}' for m in D['modules']}
# Første hint støtter metodevalg, neste hint kommer fra oppgaven.
for m in D['modules']:
 for q in m['questions']:
  if q['type']!='work' and not q.get('guidedHints'):q['guidedHints']=True;q['hints']=[('Finn definisjonen eller egenskapen som spørsmålet bruker. Vurder hvert alternativ før du velger.' if q['type']=='mc' else 'Skriv opp kjente størrelser og velg en formel fra leksjonen. Sett inn tall først etter at du har valgt metoden.')]+q['hints']
(src/'data.js').write_text('window.MATTE_DATA='+json.dumps(D,ensure_ascii=False)+';\n')
icon='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"><rect width="192" height="192" rx="40" fill="#00509e"/><text x="96" y="142" text-anchor="middle" font-size="150" fill="white" font-family="serif">∂</text></svg>'
for c in D['courses']:
 p=out/f'matte{c["id"]}';p.mkdir(exist_ok=True)
 for name in ['index.html','style.css','app.js','core.js','labs.js']:shutil.copy2(src/name,p/name)
 shutil.copytree(src/'vendor',p/'vendor',dirs_exist_ok=True)
 d={**D,'courses':[c],'modules':[m for m in D['modules'] if m['course']==c['id']],'exams':[e for e in D['exams'] if e['course']==c['id']]}
 (p/'data.js').write_text('window.MATTE_DATA='+json.dumps(d,ensure_ascii=False)+';\n')
 h=(p/'index.html').read_text().replace('<script defer src="data.js">',f'<script>window.PACK_COURSE={c["id"]};</script><script defer src="data.js">').replace('Nome · Matematikk 1–4',f'Nome · Matematikk {c["id"]}')
 h=h.replace('<a href="#settings">','<a href="../index.html">Alle fire fag</a><br><a href="#settings">')
 (p/'index.html').write_text(h)
 (p/'icon.svg').write_text(icon)
 (p/'manifest.webmanifest').write_text(json.dumps(dict(name=f'Matte {c["id"]} · Matteverkstedet',short_name=f'Matte {c["id"]}',lang='nb',start_url='./index.html',scope='./',display='standalone',background_color='#f4f7fb',theme_color='#00509e',icons=[dict(src='icon.svg',sizes='any',type='image/svg+xml')]),ensure_ascii=False))
 assets=['./']+['./'+str(f.relative_to(p)) for f in p.rglob('*') if f.is_file() and f.name!='sw.js']
 (p/'sw.js').write_text("const PREFIX='nome-matte-'+self.registration.scope;\nconst CACHE=PREFIX+'v1.0.0-20260908';\nconst FILES="+json.dumps(assets)+";\nself.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting()));});\nself.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith(PREFIX)&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});\nself.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==self.location.origin||!u.href.startsWith(self.registration.scope))return;e.respondWith(caches.open(CACHE).then(async c=>{const cached=await c.match(e.request,{ignoreSearch:true});if(cached)return cached;return fetch(e.request);}));});\n")
shutil.copy2(src/'style.css',out/'style.css')
cards=''.join(f'<article class="card"><div class="eyebrow">{c["code"]} · {c["semester"]}</div><h2>Matte {c["id"]}</h2><p>{c["intro"]}</p><p class="small muted">{sum(m["course"]==c["id"] for m in D["modules"])} leksjoner · {sum(len(m["questions"]) for m in D["modules"] if m["course"]==c["id"])} oppgaver</p><a class="button primary" href="matte{c["id"]}/index.html">Åpne Matte {c["id"]} →</a></article>' for c in D['courses'])
(out/'index.html').write_text('<!doctype html><html lang="nb"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Matteverkstedet · Nome 1–4</title><link rel="stylesheet" href="style.css"><body><header><a class="brand" href="index.html"><span class="brand-mark">∂</span><span>Matteverkstedet<small>Nome · Matematikk 1–4</small></span></a></header><main style="max-width:1200px;margin:0 auto;padding:32px 20px"><div class="eyebrow">Forstå · Øv · Repeter</div><h1>Litt matte. Hver dag.</h1><p class="muted">Fire fagpakker med forklaringer, interaktive figurer og øving. Velg faget ditt og start med kartleggingen.</p><div class="grid cols2 section">'+cards+'</div><section class="card section"><h2>Fra grunnlag til krevende oppgaver</h2><p>Begynn med korte begrepsspørsmål. Regn eksemplene selv, og bruk deretter oppgaver med flere trinn og originale eksamenssett. Feilboken og repetisjonskøen hjelper deg å følge opp det som ikke sitter.</p><p>52 leksjoner og 451 oppgaver, inkludert 156 tallvarianter. Alle 50 faghefter i de valgte Nome-versjonene har en temaleksjon. Dette er versjon 1.0; hver enkelt originaloppgave er ikke gjenskapt.</p><p>Fremdrift lagres i nettleseren. Bruk eksport/import for å flytte den mellom mobil og PC. Poengene måler øvingen i pakken, og er ingen karaktergaranti.</p><a href="LES-MEG.txt">Bruk og opplasting til folk.ntnu.no</a> · <a href="DEKNINGSKART.csv">Dekningskart</a> · <a href="KVALITET.txt">Teststatus</a></section></main></body></html>')
with (out/'DEKNINGSKART.csv').open('w',encoding='utf-8-sig',newline='') as f:
 w=csv.writer(f,delimiter=';');w.writerow(['Fag','Leksjon','Tema','Læringsmål','Oppgaver','Tallvarianter','Eksamensvarianter','Pensumhefte','Løsningsforslag'])
 for m in D['modules']:w.writerow([m['course'],m['id'],m['title'],m['goal'],len(m['questions']),sum(bool(q.get('variant')) for q in m['questions']),sum(bool(q.get('examSource')) for q in m['questions']),m['source'],m.get('sourceLF','')])
(out/'LES-MEG.txt').write_text('''MATTEVERKSTEDET — NOME MATTE 1–4
Versjon 1.0.0, 8. september 2026

START
Pakk ut hele ZIP-filen. Åpne matteverkstedet/index.html i nettleseren.
Hvert fag ligger i sin egen mappe, matte1 til matte4. HTML, JavaScript,
CSS, figurer og formelfonter følger med. Ingen installasjon eller konto trengs.
På iPhone anbefales nettsideversjonen; Filers HTML-forhåndsvisning er ikke
nødvendigvis en full nettleser og kan hindre JavaScript.

PÅ FOLK.NETTSTEDEN
Last opp hele mappen matteverkstedet til public_html. Behold mappestrukturen.
Da blir startsiden normalt https://folk.ntnu.no/tormt/matteverkstedet/
Legg en vanlig lenke til denne adressen fra din eksisterende fagoversikt.
Du kan også lenke rett til matteverkstedet/matte1/ og tilsvarende for 2–4.
Ingenting er publisert automatisk eller endret på den eksisterende nettsiden.

BRUK
1. Ta kartleggingen i hvert fag.
2. Les én leksjon og prøv figuren. Regn eksemplet på papir før du åpner løsningen.
3. Øv uten hint først; bruk hint når du står fast.
4. Bruk bussmodus for korte teoriøkter. Følg opp feil og repetisjon senere.
5. Ta blandede prøver, og løs originaleksamener i full lengde på papir.

LAGRING
Resultater, egne notater og bokmerker lagres i nettleseren. Det er ingen skyprofil.
På samme nettsted beholder pakkene resultater på tvers av fag. Lokale file:-adresser
kan behandles forskjellig av ulike nettlesere. Eksporter fremdrift jevnlig.
Importer JSON-filen på en annen enhet; nyeste forsøk per oppgave beholdes.
En pågående økt må fullføres før du laster siden på nytt. Registrerte svar beholdes.

UTEN NETT
Lokale filer har alle avhengigheter inkludert. Fra en HTTPS-nettside forsøker
pakken å mellomlagre filene ved første åpning. Vent til siden er ferdig lastet,
og sjekk Innstillinger. Nettleseren kan slette mellomlager ved plassmangel.
Eksterne eksamenssett og NTNU-hefter krever nettilgang.

INNHOLD
52 leksjoner, 451 oppgaver. 156 av oppgavene er tallvarianter av eksisterende
oppgavetyper. 16 har eksplisitt kobling til nyere eksamensoppgaver.
Det finnes egne forklaringer og løsninger i alle temaene, men de korte leksjonene
kan ikke erstatte all dybden i originalheftene. Kilder og dekningskart ligger i hvert fag.
Automatisk score gjelder korte svar. Lange utledninger har egenvurdering med sjekkliste.
Score er ikke en prognose for eksamenskarakter.

KILDER OG VERSJONER
TMA4101: Nomes 2024h-side, også brukt for siste eksamen høsten 2025.
TMA4106: 2025v. TMA4111: 2025h. TMA4121: 2026v.
Kurskontroll: 7. september 2026. Dette er de nyeste identifiserte Nome-versjonene
for disse fagkodene, ikke en påstand om at fagkodene fortsatt undervises i 2026.
Pensumhefter og eksamenssett lenkes hos NTNU og er ikke kopiert inn i pakken.
KaTeX har egen MIT-lisens i vendor/LICENSE. Egne figurer er tegnet matematisk i SVG.

VIDERE REDIGERING
Kildebyggerne og kontrollskriptene følger med i kildekode/. Nettstedfilene kan
redigeres direkte, eller bygges på nytt med Python og Node. Se kildekode/README.txt.
''',encoding='utf-8')
code=out/'kildekode';code.mkdir(exist_ok=True)
for f in ['content.py','enrich.py','build.py']:shutil.copy2(ROOT/f,code/f)
(code/'research').mkdir(exist_ok=True)
shutil.copy2(ROOT/'research'/'sources.json',code/'research'/'sources.json')
shutil.copytree(src,code/'dist',dirs_exist_ok=True);shutil.copytree(ROOT/'tests',code/'tests',dirs_exist_ok=True)
(code/'README.txt').write_text('Kjør python enrich.py og deretter python build.py. Byggerne bruker prosjektmappen sin som rot. Tester: node tests/verify.cjs dist og LINKEDOM_PATH=/sti/til/linkedom node tests/dom.cjs dist. DOM-testen trenger npm-pakken linkedom. Kildeheftene ligger hos NTNU; de er ikke med i ZIP.\n')
print(out)
