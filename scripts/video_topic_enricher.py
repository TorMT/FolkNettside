#!/usr/bin/env python3
"""
Enrich videolister med beskrivelse, tema, gruppering og delnavn.

Stotter:
  - heuristic: lokal fallback fra tittel/beskrivelse/metadata
  - ollama: lokal modell pa http://127.0.0.1:11434
  - openrouter: gratis / ekstern modell via OPENROUTER_API_KEY

Input-format (linjevis):
  Tittel|URL|Beskrivelse|tema1,tema2
  [Tittel](URL)
  URL

Output:
  {
    "videos": [
      {
        "title": "...",
        "url": "...",
        "description": "...",
        "themes": ["..."],
        "group": "...",
        "part": "..."
      }
    ]
  }
"""

from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
import tempfile
import urllib.error
import urllib.request
from collections import Counter
from pathlib import Path
from typing import Any


STOPWORDS = {
    "og", "i", "pa", "som", "en", "et", "for", "til", "av", "det", "den", "de",
    "er", "har", "med", "om", "vi", "du", "jeg", "at", "fra", "ikke", "kan",
    "skal", "blir", "dette", "der", "her", "sa", "men", "eller", "nar",
    "the", "and", "with", "that", "this", "from", "are", "was", "were",
    "you", "your", "have", "has", "not", "can", "will", "into", "about", "how",
}


MOJIBAKE_MAP = {
    "???": "-",
    "???": "-",
    "???": "...",
    "??": "o",
    "??": "O",
    "??": "a",
    "??": "A",
    "??": "ae",
    "??": "AE",
    "p??": "pa",
    "n??r": "nar",
    "s??": "sa",
    "pr??v": "prov",
    "kj??r": "kjor",
}


def clean_group_label(text: str) -> str:
    s = str(text or "").strip()
    for bad, good in MOJIBAKE_MAP.items():
        s = s.replace(bad, good)
    s = s.replace("_", " ")
    s = s.replace("?", " - ")
    s = re.sub(r"\s+", " ", s)
    return s.strip(" -:|\t")


def normalize_group_key(text: str) -> str:
    s = clean_group_label(text).lower()
    s = re.sub(r"[^a-z0-9\s-]", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def split_title_parts(title: str) -> tuple[str, str]:
    raw = clean_group_label(title)
    patterns = [
        r"^(.*?)(?:\s+(del|part|episode|ep)\s*([0-9]+[a-z]?))$",
        r"^(.*?)(?:\s*[-:|]\s*(del|part|episode|ep)\s*([0-9]+[a-z]?))$",
        r"^(.*?)(?:\s*[-:|]\s*(q[0-9]+[a-z0-9-]*))$",
        r"^(.*?)(?:\s*[-:|]\s*([A-Z]))$",
    ]
    for pattern in patterns:
        m = re.match(pattern, raw, flags=re.I)
        if not m:
            continue
        if len(m.groups()) >= 3 and m.group(3):
            return clean_group_label(m.group(1)), clean_group_label(f"{m.group(2)} {m.group(3)}")
        return clean_group_label(m.group(1)), clean_group_label(m.group(2))
    return raw, ""


def derive_group_and_part(title: str, description: str = "", existing_group: str = "", existing_part: str = "") -> tuple[str, str]:
    title_clean = clean_group_label(title)
    desc_clean = clean_group_label(description)
    group_clean = clean_group_label(existing_group)
    part_clean = clean_group_label(existing_part)

    if not group_clean:
        if desc_clean and normalize_group_key(desc_clean) != normalize_group_key(title_clean):
            group_clean = desc_clean
        else:
            group_clean = split_title_parts(title_clean)[0]

    if not part_clean and title_clean:
        prefix_pattern = r"^" + re.escape(group_clean) + r"(?:\s*[-:|]\s*)?"
        stripped = re.sub(prefix_pattern, "", title_clean, flags=re.I).strip(" -:|")
        part_clean = clean_group_label(stripped)
        if not part_clean:
            _, guessed_part = split_title_parts(title_clean)
            part_clean = guessed_part

    if normalize_group_key(group_clean) == normalize_group_key(title_clean):
        part_clean = ""

    return group_clean or title_clean, part_clean


def parse_line(line: str) -> dict[str, Any] | None:
    s = line.strip()
    if not s or s.startswith("#"):
        return None

    m = re.match(r"^\[([^\]]+)\]\((https?://[^\s)]+)\)$", s, flags=re.I)
    if m:
        return {"title": m.group(1).strip(), "url": m.group(2).strip(), "description": "", "themes": []}

    if "|" in s:
        parts = [p.strip() for p in s.split("|")]
        title = parts[0] if len(parts) > 0 else ""
        url = parts[1] if len(parts) > 1 else ""
        description = parts[2] if len(parts) > 2 else ""
        themes = [x.strip() for x in (parts[3] if len(parts) > 3 else "").split(",") if x.strip()]
        if url.startswith("http"):
            return {"title": title or url, "url": url, "description": description, "themes": themes}
        return None

    if s.startswith("http://") or s.startswith("https://"):
        return {"title": s, "url": s, "description": "", "themes": []}
    return None


def parse_playlist(path: Path) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    for line in path.read_text(encoding="utf-8").splitlines():
        rec = parse_line(line)
        if rec:
            items.append(rec)
    return items


def _build_yt_dlp_base_cmd(url: str, cookies_file: str | None = None, cookies_from_browser: str | None = None) -> list[str]:
    cmd = ["yt-dlp", "--no-warnings", "--no-playlist"]
    if cookies_file:
        cmd.extend(["--cookies", cookies_file])
    if cookies_from_browser:
        cmd.extend(["--cookies-from-browser", cookies_from_browser])
    cmd.append(url)
    return cmd


def run_yt_dlp_subtitles(url: str, out_dir: Path, cookies_file: str | None = None, cookies_from_browser: str | None = None) -> str:
    out_tpl = str(out_dir / "%(id)s.%(ext)s")
    cmd = _build_yt_dlp_base_cmd(url, cookies_file=cookies_file, cookies_from_browser=cookies_from_browser)
    cmd[1:1] = [
        "--skip-download",
        "--write-subs",
        "--write-auto-subs",
        "--sub-langs",
        "no.*,nb.*,nn.*,en.*",
        "--convert-subs",
        "srt",
        "-o",
        out_tpl,
    ]
    subprocess.run(cmd, check=False, capture_output=True, text=True)
    candidates = sorted(out_dir.glob("*.srt")) + sorted(out_dir.glob("*.vtt"))
    if not candidates:
        return ""
    return candidates[0].read_text(encoding="utf-8", errors="ignore")


def run_yt_dlp_metadata(url: str, cookies_file: str | None = None, cookies_from_browser: str | None = None) -> dict[str, Any]:
    cmd = _build_yt_dlp_base_cmd(url, cookies_file=cookies_file, cookies_from_browser=cookies_from_browser)
    cmd[1:1] = ["--skip-download", "--dump-single-json"]
    try:
        proc = subprocess.run(cmd, check=False, capture_output=True, text=True)
        if proc.returncode != 0 or not proc.stdout.strip():
            return {}
        raw = json.loads(proc.stdout)
        return {
            "title": clean_group_label(raw.get("title", "")),
            "description": clean_group_label(raw.get("description", "")),
            "uploader": clean_group_label(raw.get("uploader", "")),
            "channel": clean_group_label(raw.get("channel", "")),
            "upload_date": clean_group_label(raw.get("upload_date", "")),
            "tags": [clean_group_label(x) for x in (raw.get("tags") or []) if clean_group_label(x)],
            "thumbnail": clean_group_label(raw.get("thumbnail", "")),
        }
    except Exception:
        return {}


def transcribe_with_whisper_cli(url: str, out_dir: Path, cookies_file: str | None = None, cookies_from_browser: str | None = None, model: str = "small") -> str:
    audio_tmpl = str(out_dir / "audio.%(ext)s")
    dl_cmd = _build_yt_dlp_base_cmd(url, cookies_file=cookies_file, cookies_from_browser=cookies_from_browser)
    dl_cmd[1:1] = ["-x", "--audio-format", "mp3", "-o", audio_tmpl]
    subprocess.run(dl_cmd, check=False, capture_output=True, text=True)
    audio_candidates = sorted(out_dir.glob("audio.*"))
    if not audio_candidates:
        return ""

    whisper_cmd = [
        "whisper",
        str(audio_candidates[0]),
        "--model",
        model,
        "--language",
        "Norwegian",
        "--output_format",
        "txt",
        "--output_dir",
        str(out_dir),
    ]
    subprocess.run(whisper_cmd, check=False, capture_output=True, text=True)
    txt_candidates = sorted(out_dir.glob("audio*.txt"))
    if not txt_candidates:
        return ""
    return txt_candidates[0].read_text(encoding="utf-8", errors="ignore").strip()


def subtitle_to_text(raw: str) -> str:
    txt = raw
    txt = re.sub(r"^\d+\s*$", "", txt, flags=re.M)
    txt = re.sub(r"\d{2}:\d{2}:\d{2}[,.\d]*\s*-->\s*\d{2}:\d{2}:\d{2}[,.\d]*", "", txt)
    txt = re.sub(r"<[^>]+>", " ", txt)
    txt = re.sub(r"\[[^\]]+\]", " ", txt)
    txt = re.sub(r"\s+", " ", txt).strip()
    return txt


def extract_themes(text: str, k: int = 6) -> list[str]:
    words = re.findall(r"[A-Za-z0-9][A-Za-z0-9\-]{2,}", text.lower())
    words = [w for w in words if w not in STOPWORDS]
    freq = Counter(words)
    return [w for w, _ in freq.most_common(k)]


def make_description(text: str, max_len: int = 180) -> str:
    if not text:
        return ""
    sent = re.split(r"(?<=[.!?])\s+", text.strip())[0]
    return (sent[: max_len - 3] + "...") if len(sent) > max_len else sent


def normalize_themes(themes: list[str], k: int = 6) -> list[str]:
    out: list[str] = []
    for theme in themes:
        clean = clean_group_label(theme).lower()
        clean = re.sub(r"\s+", " ", clean).strip(" -")
        if not clean or clean in STOPWORDS:
            continue
        if clean not in out:
            out.append(clean)
    return out[:k]


def looks_like_placeholder_title(title: str) -> bool:
    clean = clean_group_label(title).lower()
    if not clean:
        return True
    if clean.startswith("http://") or clean.startswith("https://"):
        return True
    placeholders = {"ukjent", "unknown", "video", "del-ukjent", "del ukjent"}
    if clean in placeholders:
        return True
    return "ukjent" in clean


def extract_json_object(text: str) -> dict[str, Any] | None:
    raw = (text or "").strip()
    if not raw:
        return None
    candidates = [raw]
    fenced = re.findall(r"```(?:json)?\s*(\{.*?\})\s*```", raw, flags=re.S | re.I)
    candidates.extend(fenced)
    for candidate in candidates:
        try:
            parsed = json.loads(candidate)
            if isinstance(parsed, dict):
                return parsed
        except Exception:
            pass
    m = re.search(r"\{.*\}", raw, flags=re.S)
    if m:
        try:
            parsed = json.loads(m.group(0))
            if isinstance(parsed, dict):
                return parsed
        except Exception:
            return None
    return None


def build_ai_prompt(text: str, title: str = "", description: str = "", source_meta: dict[str, Any] | None = None) -> str:
    source_meta = source_meta or {}
    source_title = source_meta.get("title", "")
    source_desc = source_meta.get("description", "")
    source_tags = ", ".join(source_meta.get("tags", [])[:10])
    return (
        "Du er en fagassistent for videomateriale. "
        "Svar KUN med gyldig JSON pa formatet "
        '{"title":"kort ryddig videotittel","description":"kort oppsummering (1-3 setninger)",'
        '"themes":["tema1","tema2","tema3"],"group_title":"felles forelesningsnavn","part_label":"unik del eller suffix"}. '
        "Bruk bare informasjon som faktisk finnes i inputen. Ikke finn opp temaer eller titler. "
        "Hvis tittelen i input er ukjent eller svak, men kildetittel/metatekst er bedre, bruk den. "
        "Hvis flere videoer har nesten samme navn, f.eks. Del 1 og Del 2 eller A og B, skal group_title beholde fellesnavnet og part_label bare inneholde den unike delen.\n\n"
        f"Eksisterende videotittel: {title}\n"
        f"Eksisterende beskrivelse: {description}\n"
        f"Kildetittel fra videoplattform: {source_title}\n"
        f"Kildebeskrivelse fra videoplattform: {source_desc[:1200]}\n"
        f"Kildetagger fra videoplattform: {source_tags}\n\n"
        f"Transkripsjon / tekstgrunnlag:\n{text[:9000]}"
    )


def ai_classify_with_ollama(text: str, model: str, title: str = "", description: str = "", source_meta: dict[str, Any] | None = None) -> dict[str, Any] | None:
    if not text.strip():
        return None
    prompt = build_ai_prompt(text, title=title, description=description, source_meta=source_meta)
    payload = json.dumps({"model": model, "prompt": prompt, "stream": False, "format": "json"}).encode("utf-8")
    req = urllib.request.Request(
        "http://127.0.0.1:11434/api/generate",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            raw = resp.read().decode("utf-8", errors="ignore")
        obj = json.loads(raw)
        parsed = extract_json_object(obj.get("response", ""))
        if not parsed:
            return None
        return {
            "title": clean_group_label(parsed.get("title", "")),
            "description": clean_group_label(parsed.get("description", "")),
            "themes": normalize_themes(parsed.get("themes", []) if isinstance(parsed.get("themes", []), list) else []),
            "group_title": clean_group_label(parsed.get("group_title", "")),
            "part_label": clean_group_label(parsed.get("part_label", "")),
        }
    except Exception:
        return None


def ai_classify_with_openrouter(text: str, model: str, api_key: str, title: str = "", description: str = "", source_meta: dict[str, Any] | None = None) -> dict[str, Any] | None:
    if not text.strip() or not api_key.strip():
        return None
    prompt = build_ai_prompt(text, title=title, description=description, source_meta=source_meta)
    payload = json.dumps({
        "model": model,
        "messages": [
            {"role": "system", "content": "Svar kun med JSON. Ikke bruk markdown."},
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.2,
    }).encode("utf-8")
    req = urllib.request.Request(
        "https://openrouter.ai/api/v1/chat/completions",
        data=payload,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://tormt.folk.ntnu.no",
            "X-Title": "FolkNettside Video Enricher",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=90) as resp:
            raw = resp.read().decode("utf-8", errors="ignore")
        obj = json.loads(raw)
        content = (((obj.get("choices") or [{}])[0].get("message") or {}).get("content") or "")
        parsed = extract_json_object(content)
        if not parsed:
            return None
        return {
            "title": clean_group_label(parsed.get("title", "")),
            "description": clean_group_label(parsed.get("description", "")),
            "themes": normalize_themes(parsed.get("themes", []) if isinstance(parsed.get("themes", []), list) else []),
            "group_title": clean_group_label(parsed.get("group_title", "")),
            "part_label": clean_group_label(parsed.get("part_label", "")),
        }
    except Exception:
        return None


def chunk_text(text: str, chunk_words: int = 900, overlap_words: int = 120, max_chunks: int = 8) -> list[str]:
    words = text.split()
    if not words:
        return []
    chunks: list[str] = []
    start = 0
    while start < len(words) and len(chunks) < max_chunks:
        end = min(len(words), start + chunk_words)
        chunks.append(" ".join(words[start:end]))
        if end >= len(words):
            break
        start = max(0, end - overlap_words)
    return chunks


def ai_classify_long_text(text: str, provider: str, title: str = "", description: str = "", source_meta: dict[str, Any] | None = None, ollama_model: str = "llama3.1:8b", openrouter_model: str = "openrouter/free", openrouter_api_key: str = "") -> dict[str, Any] | None:
    chunks = chunk_text(text)
    if not chunks:
        return None

    all_desc: list[str] = []
    theme_counter: Counter[str] = Counter()
    group_title = ""
    part_label = ""
    clean_title = ""

    for ch in chunks:
        if provider == "ollama":
            out = ai_classify_with_ollama(ch, ollama_model, title=title, description=description, source_meta=source_meta)
        elif provider == "openrouter":
            out = ai_classify_with_openrouter(ch, openrouter_model, openrouter_api_key, title=title, description=description, source_meta=source_meta)
        else:
            out = None
        if not out:
            continue
        if out.get("description"):
            all_desc.append(out["description"].strip())
        if not group_title:
            group_title = str(out.get("group_title", "")).strip()
        if not part_label:
            part_label = str(out.get("part_label", "")).strip()
        if not clean_title:
            clean_title = str(out.get("title", "")).strip()
        for t in out.get("themes", []) or []:
            if t:
                theme_counter[t.strip().lower()] += 1

    if not all_desc and not theme_counter and not group_title and not part_label and not clean_title:
        return None

    summary = " ".join(all_desc[:3]).strip()
    if len(summary) > 320:
        summary = summary[:317] + "..."

    return {
        "title": clean_title,
        "description": summary,
        "themes": [t for t, _ in theme_counter.most_common(6)],
        "group_title": group_title,
        "part_label": part_label,
    }


def ollama_available() -> bool:
    req = urllib.request.Request("http://127.0.0.1:11434/api/tags", method="GET")
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            return 200 <= resp.status < 300
    except Exception:
        return False


def openrouter_available(api_key: str) -> bool:
    return bool((api_key or "").strip())


def merge_source_metadata(title: str, description: str, themes: list[str], source_meta: dict[str, Any]) -> tuple[str, str, list[str]]:
    source_title = clean_group_label(source_meta.get("title", ""))
    source_description = clean_group_label(source_meta.get("description", ""))
    source_tags = normalize_themes(source_meta.get("tags", []) if isinstance(source_meta.get("tags", []), list) else [])

    if looks_like_placeholder_title(title) and source_title:
        title = source_title
    if not description and source_description:
        description = make_description(source_description)
    if not themes and source_tags:
        themes = source_tags[:6]
    return title, description, themes


def enrich(items: list[dict[str, Any]], ai_provider: str = "heuristic", ollama_model: str = "llama3.1:8b", openrouter_model: str = "openrouter/free", openrouter_api_key: str = "", cookies_file: str | None = None, cookies_from_browser: str | None = None, transcribe_with_whisper: bool = False, whisper_model: str = "small") -> list[dict[str, Any]]:
    enriched: list[dict[str, Any]] = []
    for item in items:
        title = item.get("title") or item.get("url", "")
        url = item.get("url", "")
        description = item.get("description", "")
        themes = normalize_themes(item.get("themes", []) or [])
        existing_group = item.get("group", "") or item.get("group_title", "") or ""
        existing_part = item.get("part", "") or item.get("part_label", "") or ""

        source_meta = run_yt_dlp_metadata(url, cookies_file=cookies_file, cookies_from_browser=cookies_from_browser)
        title, description, themes = merge_source_metadata(title, description, themes, source_meta)

        txt = ""
        if not description or not themes or looks_like_placeholder_title(title):
            with tempfile.TemporaryDirectory() as tmp:
                raw_subs = run_yt_dlp_subtitles(url, Path(tmp), cookies_file=cookies_file, cookies_from_browser=cookies_from_browser)
            txt = subtitle_to_text(raw_subs)
            if not txt and transcribe_with_whisper:
                with tempfile.TemporaryDirectory() as tmp2:
                    txt = transcribe_with_whisper_cli(url, Path(tmp2), cookies_file=cookies_file, cookies_from_browser=cookies_from_browser, model=whisper_model)

        ai_out = None
        if ai_provider in {"ollama", "openrouter"}:
            analysis_text = txt.strip() or " ".join(x for x in [source_meta.get("title", ""), source_meta.get("description", ""), " ".join(source_meta.get("tags", [])[:10])] if x).strip()
            if analysis_text:
                ai_out = ai_classify_long_text(
                    analysis_text,
                    provider=ai_provider,
                    title=title,
                    description=description,
                    source_meta=source_meta,
                    ollama_model=ollama_model,
                    openrouter_model=openrouter_model,
                    openrouter_api_key=openrouter_api_key,
                )
                if not ai_out:
                    print(f"[WARN] {ai_provider} klassifisering feilet for {url}. Faller tilbake til heuristikk.", file=sys.stderr)

        if ai_out:
            ai_title = clean_group_label(ai_out.get("title", ""))
            ai_desc = clean_group_label(ai_out.get("description", ""))
            ai_themes = normalize_themes(ai_out.get("themes", []) or [])
            ai_group = clean_group_label(ai_out.get("group_title", ""))
            ai_part = clean_group_label(ai_out.get("part_label", ""))
            if looks_like_placeholder_title(title) and ai_title:
                title = ai_title
            if not description and ai_desc:
                description = ai_desc
            if not themes and ai_themes:
                themes = ai_themes
            if not existing_group and ai_group:
                existing_group = ai_group
            if not existing_part and ai_part:
                existing_part = ai_part
        elif txt:
            if not description:
                description = make_description(txt)
            if not themes:
                themes = extract_themes(txt)

        if not themes:
            fallback_text = " ".join(x for x in [title, description, existing_group, existing_part, source_meta.get("title", ""), source_meta.get("description", ""), " ".join(source_meta.get("tags", [])[:8])] if x).strip()
            if fallback_text:
                themes = extract_themes(fallback_text, k=6)
        if not description:
            fallback_text = " ".join(x for x in [description, source_meta.get("description", ""), title, existing_group, existing_part] if x).strip()
            if fallback_text:
                description = make_description(fallback_text)

        group, part = derive_group_and_part(title, description, existing_group, existing_part)
        enriched.append({
            "title": clean_group_label(title),
            "url": url,
            "description": clean_group_label(description),
            "themes": normalize_themes(themes),
            "group": clean_group_label(group),
            "part": clean_group_label(part),
        })
    return enriched


def main() -> None:
    ap = argparse.ArgumentParser(description="Enrich videoliste med beskrivelse og tema")
    ap.add_argument("--input", required=True, help="Sti til videoliste (.txt/.md med URL-linjer)")
    ap.add_argument("--output", required=True, help="Sti til output JSON")
    ap.add_argument(
        "--ai-provider",
        choices=["heuristic", "ollama", "openrouter"],
        default="heuristic",
        help="Tema/description-metode: heuristic (default), ollama eller openrouter",
    )
    ap.add_argument(
        "--ollama-model",
        default="llama3.1:8b",
        help="Modellnavn i lokal Ollama (kun brukt med --ai-provider ollama)",
    )
    ap.add_argument(
        "--openrouter-model",
        default=os.getenv("OPENROUTER_MODEL", "openrouter/free"),
        help="OpenRouter-modell, f.eks. openrouter/free eller en konkret :free-modell",
    )
    ap.add_argument(
        "--openrouter-api-key",
        default=os.getenv("OPENROUTER_API_KEY", ""),
        help="API-nokkel for OpenRouter. Kan ogsa settes i OPENROUTER_API_KEY.",
    )
    ap.add_argument("--cookies", default=None, help="Sti til cookies.txt for yt-dlp (valgfritt, nyttig for Panopto)")
    ap.add_argument("--cookies-from-browser", default=None, help="Les cookies direkte fra nettleser (f.eks. chrome)")
    ap.add_argument(
        "--transcribe-with-whisper",
        action="store_true",
        help="Hvis undertekster mangler: forsok lokal transkribering via whisper CLI",
    )
    ap.add_argument(
        "--whisper-model",
        default="small",
        help="Whisper-modellnavn ved --transcribe-with-whisper (tiny/base/small/medium/large)",
    )
    args = ap.parse_args()

    if args.ai_provider == "ollama" and not ollama_available():
        print(
            "[FEIL] Kunne ikke kontakte Ollama pa http://127.0.0.1:11434.\n"
            "Start Ollama og prov igjen, eller bruk --ai-provider heuristic/openrouter.\n"
            "Fortsetter med heuristic automatisk.",
            file=sys.stderr,
        )
        args.ai_provider = "heuristic"

    if args.ai_provider == "openrouter" and not openrouter_available(args.openrouter_api_key):
        print(
            "[FEIL] OPENROUTER_API_KEY mangler. Sett miljo variabel eller bruk --openrouter-api-key.\n"
            "Fortsetter med heuristic automatisk.",
            file=sys.stderr,
        )
        args.ai_provider = "heuristic"

    inp = Path(args.input)
    out = Path(args.output)

    items = parse_playlist(inp)
    videos = enrich(
        items,
        ai_provider=args.ai_provider,
        ollama_model=args.ollama_model,
        openrouter_model=args.openrouter_model,
        openrouter_api_key=args.openrouter_api_key,
        cookies_file=args.cookies,
        cookies_from_browser=args.cookies_from_browser,
        transcribe_with_whisper=args.transcribe_with_whisper,
        whisper_model=args.whisper_model,
    )
    out.write_text(json.dumps({"videos": videos}, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Skrev {len(videos)} videoer til {out}")


if __name__ == "__main__":
    main()
