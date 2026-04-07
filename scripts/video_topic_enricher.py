#!/usr/bin/env python3
"""
Gratis, lokal enrich av videolister med beskrivelse + tema.

Forutsetter:
  - yt-dlp i PATH (for å hente undertekster fra YouTube/Panopto m.m.)
  - (valgfritt) Ollama lokalt for AI-klassifisering
  - (valgfritt) whisper CLI for lokal transkribering når undertekster mangler

Input-format (linjevis):
  Tittel|URL|Beskrivelse|tema1,tema2
  [Tittel](URL)
  URL

Output:
  JSON-fil med struktur:
  {
    "videos": [
      {"title": "...", "url": "...", "description": "...", "themes": ["..."], "group": "...", "part": "..."}
    ]
  }

Eksempel AI-klassifisering:
  python scripts/video_topic_enricher.py --input forelesninger.txt --output forelesninger.json --ai-provider ollama --ollama-model llama3.1:8b

Merk:
  - Ved AI-modus chunkes transkripsjon i flere deler for bedre dekning av hele videoen.
  - For innloggede videoer (f.eks. Panopto), bruk --cookies eller --cookies-from-browser.
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
import tempfile
import urllib.request
from collections import Counter
from pathlib import Path


STOPWORDS = {
    # no
    "og", "i", "på", "som", "en", "et", "for", "til", "av", "det", "den", "de",
    "er", "har", "med", "om", "vi", "du", "jeg", "at", "fra", "ikke", "kan",
    "skal", "blir", "dette", "der", "her", "så", "men", "eller", "når",
    # en
    "the", "and", "for", "with", "that", "this", "from", "are", "was", "were",
    "you", "your", "have", "has", "not", "can", "will", "into", "about", "how",
}


def clean_group_label(text: str) -> str:
    return re.sub(r"\s+", " ", str(text or "").replace("_", " ").replace("?", " - ").replace("?", " - ")).strip(" -:|\t")


def normalize_group_key(text: str) -> str:
    s = clean_group_label(text).lower()
    s = re.sub(r"[^a-z0-9???\s-]", " ", s)
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


def parse_line(line: str) -> dict | None:
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


def parse_playlist(path: Path) -> list[dict]:
    items: list[dict] = []
    for line in path.read_text(encoding="utf-8").splitlines():
        rec = parse_line(line)
        if rec:
            items.append(rec)
    return items


def run_yt_dlp_subtitles(
    url: str,
    out_dir: Path,
    cookies_file: str | None = None,
    cookies_from_browser: str | None = None,
) -> str:
    out_tpl = str(out_dir / "%(id)s.%(ext)s")
    cmd = [
        "yt-dlp",
        "--skip-download",
        "--write-subs",
        "--write-auto-subs",
        "--sub-langs",
        "no.*,en.*",
        "--convert-subs",
        "srt",
        "-o",
        out_tpl,
        url,
    ]
    if cookies_file:
        cmd.extend(["--cookies", cookies_file])
    if cookies_from_browser:
        cmd.extend(["--cookies-from-browser", cookies_from_browser])
    subprocess.run(cmd, check=False, capture_output=True, text=True)
    candidates = sorted(out_dir.glob("*.srt")) + sorted(out_dir.glob("*.vtt"))
    if not candidates:
        return ""
    return candidates[0].read_text(encoding="utf-8", errors="ignore")


def transcribe_with_whisper_cli(
    url: str,
    out_dir: Path,
    cookies_file: str | None = None,
    cookies_from_browser: str | None = None,
    model: str = "small",
) -> str:
    audio_tmpl = str(out_dir / "audio.%(ext)s")
    dl_cmd = [
        "yt-dlp",
        "-x",
        "--audio-format",
        "mp3",
        "-o",
        audio_tmpl,
        url,
    ]
    if cookies_file:
        dl_cmd.extend(["--cookies", cookies_file])
    if cookies_from_browser:
        dl_cmd.extend(["--cookies-from-browser", cookies_from_browser])
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
    words = re.findall(r"[A-Za-zÆØÅæøå][A-Za-zÆØÅæøå\-]{2,}", text.lower())
    words = [w for w in words if w not in STOPWORDS]
    freq = Counter(words)
    return [w for w, _ in freq.most_common(k)]


def make_description(text: str, max_len: int = 180) -> str:
    if not text:
        return ""
    sent = re.split(r"(?<=[.!?])\s+", text.strip())[0]
    return (sent[: max_len - 1] + "…") if len(sent) > max_len else sent


def ai_classify_with_ollama(text: str, model: str, title: str = "", description: str = "") -> dict | None:
    if not text.strip():
        return None
    prompt = (
        "Du er en fagassistent. Les transkripsjonen under og svar KUN med gyldig JSON pa formatet "
        '{"description":"kort oppsummering (2-3 setninger)","themes":["tema1","tema2","tema3"],"group_title":"felles forelesningsnavn","part_label":"unik del eller suffix"}. '
        "Maks 6 tema. Hvis flere videoer har nesten samme navn, for eksempel Del 1 og Del 2, q1ab og q1c, eller A og B, skal group_title beholde fellesnavnet og part_label bare inneholde den unike delen.\n\n"
        f"Videotittel: {title}\n"
        f"Eksisterende beskrivelse: {description}\n\n"
        f"Transkripsjon:\n{text[:7000]}"
    )
    payload = json.dumps({
        "model": model,
        "prompt": prompt,
        "stream": False,
        "format": "json",
    }).encode("utf-8")
    req = urllib.request.Request(
        "http://127.0.0.1:11434/api/generate",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=45) as resp:
            raw = resp.read().decode("utf-8", errors="ignore")
        obj = json.loads(raw)
        response_text = obj.get("response", "").strip()
        parsed = json.loads(response_text)
        desc = str(parsed.get("description", "")).strip()
        themes = [str(x).strip() for x in parsed.get("themes", []) if str(x).strip()]
        group_title = str(parsed.get("group_title", "")).strip()
        part_label = str(parsed.get("part_label", "")).strip()
        if not desc and not themes and not group_title and not part_label:
            return None
        return {"description": desc, "themes": themes[:6], "group_title": group_title, "part_label": part_label}
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


def ai_classify_long_text_with_ollama(text: str, model: str, title: str = "", description: str = "") -> dict | None:
    chunks = chunk_text(text)
    if not chunks:
        return None

    all_desc: list[str] = []
    theme_counter: Counter[str] = Counter()
    group_title = ""
    part_label = ""

    for ch in chunks:
        out = ai_classify_with_ollama(ch, model, title=title, description=description)
        if not out:
            continue
        desc = out.get("description", "")
        themes = out.get("themes", [])
        if desc:
            all_desc.append(desc.strip())
        if not group_title:
            group_title = str(out.get("group_title", "")).strip()
        if not part_label:
            part_label = str(out.get("part_label", "")).strip()
        for t in themes:
            if t:
                theme_counter[t.strip().lower()] += 1

    if not all_desc and not theme_counter and not group_title and not part_label:
        return None

    summary = " ".join(all_desc[:3]).strip()
    if len(summary) > 320:
        summary = summary[:319] + "?"

    themes = [t for t, _ in theme_counter.most_common(6)]
    return {"description": summary, "themes": themes, "group_title": group_title, "part_label": part_label}


def ollama_available() -> bool:
    req = urllib.request.Request("http://127.0.0.1:11434/api/tags", method="GET")
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            return 200 <= resp.status < 300
    except Exception:
        return False


def enrich(
    items: list[dict],
    ai_provider: str = "heuristic",
    ollama_model: str = "llama3.1:8b",
    cookies_file: str | None = None,
    cookies_from_browser: str | None = None,
    transcribe_with_whisper: bool = False,
    whisper_model: str = "small",
) -> list[dict]:
    enriched: list[dict] = []
    for item in items:
        title = item.get("title") or item.get("url", "")
        url = item.get("url", "")
        description = item.get("description", "")
        themes = item.get("themes", []) or []
        existing_group = item.get("group", "") or item.get("group_title", "") or ""
        existing_part = item.get("part", "") or item.get("part_label", "") or ""

        if not description or not themes:
            with tempfile.TemporaryDirectory() as tmp:
                raw_subs = run_yt_dlp_subtitles(
                    url,
                    Path(tmp),
                    cookies_file=cookies_file,
                    cookies_from_browser=cookies_from_browser,
                )
            txt = subtitle_to_text(raw_subs)
            if not txt and transcribe_with_whisper:
                with tempfile.TemporaryDirectory() as tmp2:
                    txt = transcribe_with_whisper_cli(
                        url,
                        Path(tmp2),
                        cookies_file=cookies_file,
                        cookies_from_browser=cookies_from_browser,
                        model=whisper_model,
                    )
            if txt:
                ai_out = None
                if ai_provider == "ollama":
                    ai_out = ai_classify_long_text_with_ollama(txt, ollama_model, title=title, description=description)
                    if not ai_out:
                        print(
                            f"[WARN] Ollama klassifisering feilet for {url}. Faller tilbake til heuristikk.",
                            file=sys.stderr,
                        )

                if ai_out:
                    ai_desc = str(ai_out.get("description", "")).strip()
                    ai_themes = ai_out.get("themes", []) or []
                    ai_group = str(ai_out.get("group_title", "")).strip()
                    ai_part = str(ai_out.get("part_label", "")).strip()
                    if not description:
                        description = ai_desc
                    if not themes:
                        themes = ai_themes
                    if not existing_group:
                        existing_group = ai_group
                    if not existing_part:
                        existing_part = ai_part
                else:
                    if not description:
                        description = make_description(txt)
                    if not themes:
                        themes = extract_themes(txt)

        if not themes:
            fallback_text = " ".join(x for x in [title, description, existing_group, existing_part] if x).strip()
            if fallback_text:
                themes = extract_themes(fallback_text, k=4)
        if not description:
            fallback_text = " ".join(x for x in [title, existing_group, existing_part] if x).strip()
            if fallback_text:
                description = make_description(fallback_text)

        group, part = derive_group_and_part(title, description, existing_group, existing_part)
        enriched.append({
            "title": title,
            "url": url,
            "description": description,
            "themes": themes,
            "group": group,
            "part": part,
        })
    return enriched


def main() -> None:
    ap = argparse.ArgumentParser(description="Enrich videoliste med beskrivelse og tema")
    ap.add_argument("--input", required=True, help="Sti til videoliste (.txt/.md med URL-linjer)")
    ap.add_argument("--output", required=True, help="Sti til output JSON")
    ap.add_argument(
        "--ai-provider",
        choices=["heuristic", "ollama"],
        default="heuristic",
        help="Tema/description-metode: heuristic (default) eller ollama",
    )
    ap.add_argument(
        "--ollama-model",
        default="llama3.1:8b",
        help="Modellnavn i lokal Ollama (kun brukt med --ai-provider ollama)",
    )
    ap.add_argument("--cookies", default=None, help="Sti til cookies.txt for yt-dlp (valgfritt, nyttig for Panopto)")
    ap.add_argument("--cookies-from-browser", default=None, help="Les cookies direkte fra nettleser (f.eks. chrome)")
    ap.add_argument(
        "--transcribe-with-whisper",
        action="store_true",
        help="Hvis undertekster mangler: forsøk lokal transkribering via whisper CLI",
    )
    ap.add_argument(
        "--whisper-model",
        default="small",
        help="Whisper-modellnavn ved --transcribe-with-whisper (tiny/base/small/medium/large)",
    )
    args = ap.parse_args()

    if args.ai_provider == "ollama" and not ollama_available():
        print(
            "[FEIL] Kunne ikke kontakte Ollama på http://127.0.0.1:11434.\n"
            "Start Ollama og prøv igjen, eller bruk --ai-provider heuristic.\n"
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
        cookies_file=args.cookies,
        cookies_from_browser=args.cookies_from_browser,
        transcribe_with_whisper=args.transcribe_with_whisper,
        whisper_model=args.whisper_model,
    )
    out.write_text(json.dumps({"videos": videos}, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Skrev {len(videos)} videoer til {out}")


if __name__ == "__main__":
    main()
