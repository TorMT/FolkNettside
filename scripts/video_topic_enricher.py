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
from urllib.parse import urlparse, parse_qs


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

LOW_SIGNAL_THEME_WORDS = {
    "bare", "han", "hun", "dere", "hvis", "kommer", "komme", "virker", "lik",
    "over", "under", "inn", "ut", "andre", "indre", "then", "there", "here",
    "vil", "fullt", "utviklet", "man", "seg", "litt", "retning", "volumet",
    "fluid", "videoen", "align", "start", "position", "kind", "language",
}


class OpenRouterRateLimitError(RuntimeError):
    pass


def load_local_env() -> None:
    candidates = [
        Path.cwd() / ".env.local",
        Path(__file__).resolve().parents[1] / ".env.local",
    ]
    for env_path in candidates:
        if not env_path.exists():
            continue
        try:
            for raw_line in env_path.read_text(encoding="utf-8", errors="ignore").splitlines():
                line = raw_line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                key, value = line.split("=", 1)
                key = key.strip()
                value = value.strip().strip('"').strip("'")
                if key and key not in os.environ:
                    os.environ[key] = value
        except Exception:
            pass
        break


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

def looks_noisy_group_label(text: str) -> bool:
    s = normalize_group_key(text)
    if not s:
        return True
    noisy_bits = [
        "webvtt",
        "captions language",
        "align start",
        "position 0",
        "felles forelesningsnavn",
        "kort oppsummering",
    ]
    return any(bit in s for bit in noisy_bits)

def extract_lecture_prefix(text: str) -> str:
    raw = clean_group_label(text)
    m = re.match(r"^(forelesning\s*\d+)\b", raw, flags=re.I)
    if m:
        number = re.sub(r"[^\d]", "", m.group(1))
        return f"Forelesning {number}"
    m = re.match(r"^(vl\s*\d+)\b", raw, flags=re.I)
    if m:
        return re.sub(r"\s+", "", m.group(1)).upper()
    return ""

def parse_structured_group_from_title(title: str) -> tuple[str, str]:
    raw = clean_group_label(title)

    m = re.match(r"^(forelesning\s*\d+)\s*[-–—:|]\s*(.+)$", raw, flags=re.I)
    if m:
        prefix = extract_lecture_prefix(m.group(1))
        rest = clean_group_label(m.group(2))
        part = ""
        suffix = re.search(r"(?:\s*[-–—:|]\s*|\s+)([A-Z])$", rest)
        if suffix:
            part = clean_group_label(suffix.group(1))
            rest = clean_group_label(rest[:suffix.start()])
        dup = re.match(r"^(.*?)\s*[-–—:|]\s*(.*?)$", rest)
        if dup and normalize_group_key(dup.group(1)) == normalize_group_key(dup.group(2)):
            rest = clean_group_label(dup.group(1))
        return f"{prefix} - {rest}".strip(" -"), part

    m = re.match(r"^(vl\s*\d+)\s+part\s*([0-9]+[a-z]?)\s*[-–—:|]\s*(.*)$", raw, flags=re.I)
    if m:
        return f"{extract_lecture_prefix(m.group(1))} - {clean_group_label(m.group(3))}".strip(" -"), f"part {m.group(2)}"

    m = re.match(r"^(vl\s*\d+)\s*[-–—:|]\s*(.*?)\s*[-–—:|]\s*(del)\s*([0-9]+[a-z]?)\s*[-–—:|]?\s*(.*)$", raw, flags=re.I)
    if m:
        detail = clean_group_label(m.group(5))
        part = f"{m.group(3)} {m.group(4)}".strip()
        if detail:
            part = f"{part} - {detail}"
        return f"{extract_lecture_prefix(m.group(1))} - {clean_group_label(m.group(2))}".strip(" -"), part

    m = re.match(r"^(vl\s*\d+)\s*[-–—:|]\s*(.*?)\s*[-–—:|]\s*(del[0-9]+[a-z]?)\s*[-–—:|]?\s*(.*)$", raw, flags=re.I)
    if m:
        detail = clean_group_label(m.group(4))
        part = clean_group_label(m.group(3))
        if detail:
            part = f"{part} - {detail}"
        return f"{extract_lecture_prefix(m.group(1))} - {clean_group_label(m.group(2))}".strip(" -"), part

    m = re.match(r"^(vl\s*\d+)\s*[-–—:|]\s*(.*?)\s*[-–—:|]\s*(del|part)\s*([0-9]+[a-z]?)$", raw, flags=re.I)
    if m:
        return f"{extract_lecture_prefix(m.group(1))} - {clean_group_label(m.group(2))}".strip(" -"), f"{m.group(3)} {m.group(4)}"

    m = re.match(r"^(vl\s*\d+)\s*[-–—:|]\s*(.*?)\s*[-–—:|]\s*(del[0-9]+[a-z]?|part\s*[0-9]+[a-z]?)$", raw, flags=re.I)
    if m:
        return f"{extract_lecture_prefix(m.group(1))} - {clean_group_label(m.group(2))}".strip(" -"), clean_group_label(m.group(3))

    m = re.match(r"^(?:exam)?\s*([12]\d{3})\b.*?\beksamen\b.*?(?:[-–—:|]\s*)?(?:exam)?\s*\1\s*(q[0-9a-z-]+)\b", raw, flags=re.I)
    if m:
        return f"Eksamen {m.group(1)}", clean_group_label(m.group(2))

    m = re.match(r"^(?:exam)?\s*([12]\d{3})\b.*?\beksamen\b", raw, flags=re.I)
    if m:
        return f"Eksamen {m.group(1)}", ""

    m = re.match(r"^(vl\s*\d+)\s+part\s*([0-9]+[a-z]?)$", raw, flags=re.I)
    if m:
        return extract_lecture_prefix(m.group(1)), f"part {m.group(2)}"

    prefix = extract_lecture_prefix(raw)
    if prefix:
        rest = re.sub(r"^" + re.escape(prefix) + r"\s*[-–—:|]?\s*", "", raw, flags=re.I)
        rest = re.sub(r"^(del|part|episode|ep)\s*[0-9]+[a-z]?\s*[-–—:|]\s*", "", rest, flags=re.I)
        rest = re.sub(r"\s*[-–—:|]?\s*(del|part|episode|ep)\s*[0-9]+[a-z]?\s*$", "", rest, flags=re.I)
        rest = re.sub(r"\s*[-–—:|]?\s*([A-Z])\s*$", "", rest)
        rest = clean_group_label(rest)
        if rest and normalize_group_key(rest) != normalize_group_key(prefix):
            return f"{prefix} - {rest}", ""
        return prefix, ""

    return "", ""


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

    title_group, title_part = parse_structured_group_from_title(title_clean)
    desc_group, _ = parse_structured_group_from_title(desc_clean)

    if title_group:
        group_clean = title_group
        if title_part:
            part_clean = title_part
    elif desc_group and extract_lecture_prefix(title_clean) and normalize_group_key(extract_lecture_prefix(desc_group)) == normalize_group_key(extract_lecture_prefix(title_clean)):
        group_clean = desc_group
    elif not group_clean or looks_noisy_group_label(group_clean):
        group_clean = split_title_parts(title_clean)[0]

    if not part_clean and title_part:
        part_clean = title_part

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
    yt_dlp_exe = os.getenv("YT_DLP_EXE", "").strip() or "yt-dlp"
    cmd = [yt_dlp_exe, "--no-warnings", "--no-playlist"]
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
        "no-orig,no,nb,nn,en",
        "--convert-subs",
        "srt",
        "-o",
        out_tpl,
    ]
    proc = safe_run(cmd)
    proc = retry_without_browser_cookies(
        proc,
        url,
        cookies_file=cookies_file,
        cookies_from_browser=cookies_from_browser,
        extra_args=[
            "--skip-download",
            "--write-subs",
            "--write-auto-subs",
            "--sub-langs",
            "no-orig,no,nb,nn,en",
            "--convert-subs",
            "srt",
            "-o",
            out_tpl,
        ],
    )
    video_id = ytdlp_id_from_url(url)
    candidates = sorted(out_dir.glob(f"{video_id}*.srt")) + sorted(out_dir.glob(f"{video_id}*.vtt")) if video_id else []
    if not candidates:
        candidates = sorted(out_dir.glob("*.srt")) + sorted(out_dir.glob("*.vtt"))
    if not candidates:
        return ""
    return candidates[0].read_text(encoding="utf-8", errors="ignore")


def run_yt_dlp_metadata(url: str, cookies_file: str | None = None, cookies_from_browser: str | None = None) -> dict[str, Any]:
    cmd = _build_yt_dlp_base_cmd(url, cookies_file=cookies_file, cookies_from_browser=cookies_from_browser)
    cmd[1:1] = ["--skip-download", "--dump-single-json"]
    try:
        proc = safe_run(cmd)
        proc = retry_without_browser_cookies(proc, url, cookies_file=cookies_file, cookies_from_browser=cookies_from_browser, extra_args=["--skip-download", "--dump-single-json"])
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
    txt = re.sub(r"^\ufeff?WEBVTT.*$", "", txt, flags=re.M)
    txt = re.sub(r"^(Kind|Language):.*$", "", txt, flags=re.M)
    txt = re.sub(r"^\d+\s*$", "", txt, flags=re.M)
    txt = re.sub(r"\d{2}:\d{2}:\d{2}[,.\d]*\s*-->\s*\d{2}:\d{2}:\d{2}[,.\d]*", "", txt)
    txt = re.sub(r"\b(?:align|position|line|size):[^\s]+", " ", txt, flags=re.I)
    txt = re.sub(r"<[^>]+>", " ", txt)
    txt = re.sub(r"\[[^\]]+\]", " ", txt)
    txt = re.sub(r"\s+", " ", txt).strip()
    return txt


def extract_themes(text: str, k: int = 6) -> list[str]:
    words = re.findall(r"[A-Za-z0-9][A-Za-z0-9\-]{2,}", text.lower())
    words = [w for w in words if w not in STOPWORDS]
    words = [w for w in words if not looks_like_low_signal_theme(w)]
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


def load_existing_output(path: Path | None) -> tuple[dict[str, dict[str, Any]], dict[str, str]]:
    if not path or not path.exists():
        return {}, {}
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}, {}
    videos = raw.get("videos") if isinstance(raw, dict) else None
    if not isinstance(videos, list):
        return {}, {}

    by_url: dict[str, dict[str, Any]] = {}
    group_descriptions: dict[str, str] = {}
    for item in videos:
        if not isinstance(item, dict):
            continue
        url = str(item.get("url", "")).strip()
        if url:
            by_url[url] = item
        group_key = normalize_group_key(item.get("group", "") or item.get("title", ""))
        group_desc = str(item.get("group_description", "") or "")
        if group_key and group_desc and group_key not in group_descriptions:
            group_descriptions[group_key] = group_desc
    return by_url, group_descriptions


def safe_run(cmd: list[str]) -> subprocess.CompletedProcess[str]:
    return subprocess.run(cmd, check=False, capture_output=True, text=True)


def retry_without_browser_cookies(proc: subprocess.CompletedProcess[str], url: str, cookies_file: str | None = None, cookies_from_browser: str | None = None, extra_args: list[str] | None = None) -> subprocess.CompletedProcess[str]:
    if proc.returncode == 0:
        return proc
    stderr = (proc.stderr or "") + "\n" + (proc.stdout or "")
    if cookies_from_browser and "Could not copy Chrome cookie database" in stderr:
        cmd = _build_yt_dlp_base_cmd(url, cookies_file=cookies_file, cookies_from_browser=None)
        cmd[1:1] = extra_args or []
        return safe_run(cmd)
    return proc


def looks_like_generic_description(description: str, title: str = "", group: str = "") -> bool:
    desc_raw = clean_group_label(description)
    desc = desc_raw.lower()
    if not desc:
        return True
    if len(desc) < 24:
        return True
    normalized_desc = normalize_group_key(desc)
    normalized_title = normalize_group_key(title)
    normalized_group = normalize_group_key(group)
    if normalized_desc in {normalized_title, normalized_group}:
        return True
    if normalized_group and normalized_group in normalized_desc and normalized_title and normalized_title in normalized_desc:
        residue = normalized_desc.replace(normalized_group, " ").replace(normalized_title, " ")
        if len(re.sub(r"\s+", " ", residue).strip().split()) <= 2:
            return True
    generic_prefixes = ("forelesning", "vl", "exam", "eksamen")
    if normalized_desc.startswith(generic_prefixes) and len(normalized_desc.split()) <= 5:
        return True
    generic_patterns = [
        r"^inneholder\s+\d+\s+deler\b",
        r"^kap\.?\s*\d+(?:-\d+)?\s*forts?\.?$",
        r"^kap\.?\s*\d+(?:-\d+)?\s*:?\s*[a-z0-9æøå' \-]{0,18}$",
        r"^samlet opptak\b",
        r"^bernoulli'?s?\s+likning,\s*forts?\.?$",
        r"^massebevarelse,\s*kontinuitetslikning,\s*forts?\.?$",
    ]
    if any(re.search(pattern, desc, flags=re.I) for pattern in generic_patterns):
        return True
    if len(normalized_desc.split()) <= 4 and normalized_desc.endswith("forts"):
        return True
    if desc_raw.count(" - ") >= 2 and normalize_group_key(desc_raw).startswith(normalized_title):
        return True
    return False


def looks_like_low_signal_theme(theme: str) -> bool:
    t = clean_group_label(theme).lower()
    if not t:
        return True
    if t in STOPWORDS or t in LOW_SIGNAL_THEME_WORDS:
        return True
    if re.fullmatch(r"tema\d+", t):
        return True
    if re.fullmatch(r"\d{6,8}", t):
        return True
    if re.fullmatch(r"vl\d+[a-z]?", t):
        return True
    if re.fullmatch(r"del\d+[- ]?ukjent", t):
        return True
    if t in {"ukjent", "unknown", "video", "forelesning"}:
        return True
    if len(t.split()) == 1 and len(t) <= 3 and t not in {"ph"}:
        return True
    return False


def themes_need_improvement(themes: list[str]) -> bool:
    if not themes:
        return True
    meaningful = [t for t in themes if not looks_like_low_signal_theme(t)]
    if len(meaningful) < 3:
        return True
    return len(meaningful) < max(2, len(themes) // 2)


def group_description_needs_improvement(description: str, group_title: str = "") -> bool:
    desc = clean_group_label(description)
    if not desc:
        return True
    if normalize_group_key(desc) == normalize_group_key(group_title):
        return True
    if looks_like_generic_description(desc, title=group_title, group=group_title):
        return True
    if len(normalize_group_key(desc).split()) < 6:
        return True
    if re.search(r"^inneholder\s+\d+\s+deler\b", desc, flags=re.I):
        return True
    return False


def item_needs_metadata_refresh(
    item: dict[str, Any],
    existing_group_descriptions: dict[str, str] | None = None,
    preserve_title_grouping: bool = False,
) -> bool:
    existing_group_descriptions = existing_group_descriptions or {}
    title = str(item.get("title", "") or "")
    description = str(item.get("description", "") or "")
    themes = normalize_themes(list(item.get("themes") or []))
    group = str(item.get("group", "") or item.get("group_title", "") or "")
    group_key = normalize_group_key(group or title)
    group_description = str(
        item.get("group_description", "") or existing_group_descriptions.get(group_key, "") or ""
    )

    if not preserve_title_grouping and looks_like_placeholder_title(title):
        return True
    if looks_like_generic_description(description, title=title, group=group):
        return True
    if themes_need_improvement(themes):
        return True
    if group_description_needs_improvement(group_description, group or title):
        return True
    if not preserve_title_grouping and group_title_needs_refresh(group):
        return True
    return False


def select_items_for_enrichment(
    items: list[dict[str, Any]],
    existing_by_url: dict[str, dict[str, Any]] | None = None,
    existing_group_descriptions: dict[str, str] | None = None,
    process_urls: list[str] | None = None,
    max_items: int = 0,
    only_refresh_weak_fields: bool = False,
    preserve_title_grouping: bool = False,
) -> list[dict[str, Any]]:
    existing_by_url = existing_by_url or {}
    requested_urls = {str(url).strip() for url in (process_urls or []) if str(url).strip()}

    selected: list[dict[str, Any]] = []
    for item in items:
        url = str(item.get("url", "") or "").strip()
        if not url:
            continue
        if requested_urls and url not in requested_urls:
            continue
        existing_item = existing_by_url.get(url, item)
        if only_refresh_weak_fields and not item_needs_metadata_refresh(
            existing_item,
            existing_group_descriptions=existing_group_descriptions,
            preserve_title_grouping=preserve_title_grouping,
        ):
            continue
        selected.append(item)
        if max_items and len(selected) >= max_items:
            break
    return selected


def merge_enriched_subset(
    all_items: list[dict[str, Any]],
    enriched_items: list[dict[str, Any]],
    existing_by_url: dict[str, dict[str, Any]] | None = None,
) -> list[dict[str, Any]]:
    existing_by_url = existing_by_url or {}
    enriched_by_url = {
        str(item.get("url", "") or "").strip(): item
        for item in enriched_items
        if str(item.get("url", "") or "").strip()
    }

    merged: list[dict[str, Any]] = []
    seen: set[str] = set()
    for item in all_items:
        url = str(item.get("url", "") or "").strip()
        if not url:
            continue
        if url in enriched_by_url:
            merged.append(enriched_by_url[url])
        elif url in existing_by_url:
            merged.append(existing_by_url[url])
        else:
            title = clean_group_label(item.get("title", "") or url)
            description = clean_group_label(item.get("description", "") or "")
            themes = normalize_themes(list(item.get("themes") or []))
            group, part = derive_group_and_part(title, description)
            merged.append({
                "title": title,
                "url": url,
                "description": description,
                "themes": themes,
                "group": clean_group_label(group),
                "part": clean_group_label(part),
            })
        seen.add(url)

    for url, item in existing_by_url.items():
        if url not in seen:
            merged.append(item)
    return merged


def group_title_needs_refresh(group_title: str) -> bool:
    group_clean = clean_group_label(group_title)
    if not group_clean:
        return True
    if re.search(r"\bukjent\b", group_clean, flags=re.I):
        return True
    if re.fullmatch(r"vl\s*\d+", group_clean, flags=re.I):
        return True
    return False


def merge_group_title_with_prefix(existing_group: str, suggested_group: str) -> str:
    existing_clean = clean_group_label(existing_group)
    suggested_clean = clean_group_label(suggested_group)
    if not suggested_clean:
        return existing_clean
    match = re.match(r"^(VL\s*\d+)(?:\s*-\s*.*)?$", existing_clean, flags=re.I)
    if not match:
        return suggested_clean or existing_clean
    prefix = re.sub(r"\s+", "", match.group(1)).upper()
    if re.match(rf"^{re.escape(prefix)}\s*-\s*", suggested_clean, flags=re.I):
        return suggested_clean
    if re.fullmatch(rf"{re.escape(prefix)}", suggested_clean, flags=re.I):
        return existing_clean or suggested_clean
    if re.match(r"^VL\s*\d+$", suggested_clean, flags=re.I):
        return existing_clean or suggested_clean
    return f"{prefix} - {suggested_clean}"


def extract_topic_from_group_title(group_title: str) -> str:
    group_clean = clean_group_label(group_title)
    if not group_clean:
        return ""
    match = re.match(r"^(VL\s*\d+)\s*-\s*(.+)$", group_clean, flags=re.I)
    if match:
        topic = clean_group_label(match.group(2))
        if topic and not re.search(r"\bukjent\b", topic, flags=re.I):
            return topic
    match = re.match(r"^(Forelesning\s*\d+)\s*-\s*(.+)$", group_clean, flags=re.I)
    if match:
        topic = clean_group_label(match.group(2))
        if topic and not re.search(r"\b(?:\d{6,8}|[A-Z]{2,}\d{3,})\b", topic):
            return topic
    return ""


def humanize_part_label(part: str) -> str:
    raw = clean_group_label(part)
    if not raw:
        return ""
    match = re.match(r"^part\s+(.+)$", raw, flags=re.I)
    if match:
        return f"Del {match.group(1)}"
    return raw[0].upper() + raw[1:] if raw else ""


def fallback_description_from_group(group_title: str, part: str = "") -> str:
    topic = extract_topic_from_group_title(group_title)
    nice_part = humanize_part_label(part)
    if topic and nice_part:
        return f"{nice_part} i forelesningen om {topic}."
    if topic:
        return f"Forelesning om {topic}."
    return ""


def ytdlp_id_from_url(url: str) -> str:
    s = str(url or "")
    match = re.search(r"youtu\.be/([A-Za-z0-9_-]+)", s)
    if match:
        return match.group(1)
    parsed = urlparse(s)
    qs = parse_qs(parsed.query)
    if "v" in qs and qs["v"]:
        return qs["v"][0]
    return ""


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
        '"themes":["termodynamikk","entropi","likevekt"],"group_title":"felles forelesningsnavn","part_label":"unik del eller suffix"}. '
        "Bruk bare informasjon som faktisk finnes i inputen. Ikke finn opp temaer eller titler. "
        "Ikke bruk plassholdere som 'tema1', 'tema2', 'ukjent' eller lignende i themes. "
        "Hvis tittelen i input er ukjent eller svak, men kildetittel/metatekst er bedre, bruk den. "
        "Hvis flere videoer har nesten samme navn, f.eks. Del 1 og Del 2 eller A og B, skal group_title beholde fellesnavnet og part_label bare inneholde den unike delen.\n\n"
        "Velg 3-6 meningsfulle themes som beskriver faginnholdet. Unnga rene datoer, bare kurskoder, bare 'forelesning', eller tags som bare sier 'ukjent'.\n\n"
        f"Eksisterende videotittel: {title}\n"
        f"Eksisterende beskrivelse: {description}\n"
        f"Kildetittel fra videoplattform: {source_title}\n"
        f"Kildebeskrivelse fra videoplattform: {source_desc[:1200]}\n"
        f"Kildetagger fra videoplattform: {source_tags}\n\n"
        f"Transkripsjon / tekstgrunnlag:\n{text[:14000]}"
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
    except urllib.error.HTTPError as exc:
        detail = ""
        try:
            detail = exc.read().decode("utf-8", errors="ignore").strip()
        except Exception:
            detail = ""
        print(f"[OPENROUTER] HTTP {exc.code} for {title or source_meta.get('title', '') or 'video'}: {detail}", file=sys.stderr)
        if exc.code == 429:
            raise OpenRouterRateLimitError(detail or f"HTTP 429 fra OpenRouter for {title or source_meta.get('title', '') or 'video'}")
        return None
    except urllib.error.URLError as exc:
        print(f"[OPENROUTER] URL-feil for {title or source_meta.get('title', '') or 'video'}: {exc}", file=sys.stderr)
        return None
    except Exception:
        return None


def chunk_text(text: str, chunk_words: int = 1000, overlap_words: int = 160, max_chunks: int = 12) -> list[str]:
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
        try:
            if provider == "ollama":
                out = ai_classify_with_ollama(ch, ollama_model, title=title, description=description, source_meta=source_meta)
            elif provider == "openrouter":
                out = ai_classify_with_openrouter(ch, openrouter_model, openrouter_api_key, title=title, description=description, source_meta=source_meta)
            else:
                out = None
        except OpenRouterRateLimitError:
            raise
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
    if (not description or looks_like_generic_description(description, title=title)) and source_description:
        description = make_description(source_description)
    if themes_need_improvement(themes) and source_tags:
        themes = source_tags[:6]
    return title, description, themes


def build_group_description(group_title: str, items: list[dict[str, Any]], provider: str, ollama_model: str, openrouter_model: str, openrouter_api_key: str) -> str:
    meaningful_descriptions = []
    theme_counter: Counter[str] = Counter()
    parts = []
    for item in items:
        desc = clean_group_label(item.get("description", ""))
        if desc and not looks_like_generic_description(desc, title=item.get("title", ""), group=group_title):
            meaningful_descriptions.append(desc)
        for theme in normalize_themes(item.get("themes", []) or [], k=10):
            if not looks_like_low_signal_theme(theme):
                theme_counter[theme] += 1
        part = clean_group_label(item.get("part", ""))
        if part:
            parts.append(part)

    if provider in {"ollama", "openrouter"}:
        source_blob = "\n".join(
            filter(
                None,
                [
                    f"Gruppe: {group_title}",
                    "Deler: " + ", ".join(parts[:8]) if parts else "",
                    "Temaer: " + ", ".join([t for t, _ in theme_counter.most_common(8)]) if theme_counter else "",
                    "Beskrivelser: " + " | ".join(meaningful_descriptions[:6]) if meaningful_descriptions else "",
                ],
            )
        )
        prompt = (
            "Svar kun med JSON pa formatet "
            '{"group_description":"kort norsk gruppebeskrivelse (1-2 setninger)","themes":["tema1","tema2","tema3"]}. '
            "Bruk bare det som finnes i inputen. Ikke finn opp detaljer. "
            "Velg konkrete faglige temaer, ikke datoer eller generiske ord.\n\n"
            + source_blob
        )
        ai_group = None
        try:
            if provider == "ollama":
                ai_group = ai_classify_with_ollama(source_blob, ollama_model, title=group_title, description="", source_meta={"title": group_title})
            else:
                ai_group = ai_classify_with_openrouter(source_blob, openrouter_model, openrouter_api_key, title=group_title, description="", source_meta={"title": group_title})
        except OpenRouterRateLimitError:
            raise
        if ai_group:
            desc = clean_group_label(ai_group.get("description", ""))
            if desc:
                return desc

    if meaningful_descriptions:
        unique_descriptions = []
        seen_desc = set()
        for desc in meaningful_descriptions:
            key = normalize_group_key(desc)
            if key in seen_desc:
                continue
            seen_desc.add(key)
            unique_descriptions.append(desc)
        if len(unique_descriptions) > 1 and len(items) > 1:
            lead = unique_descriptions[0].rstrip(". ")
            extra = unique_descriptions[1].rstrip(". ")
            return f"{lead}. Dekker ogsa {extra.lower()}."
        return unique_descriptions[0]
    top_themes = [t for t, _ in theme_counter.most_common(4)]
    if top_themes:
        return f"Forelesningsgruppe om {', '.join(top_themes[:-1]) + ' og ' + top_themes[-1] if len(top_themes) > 1 else top_themes[0]}."
    topic_fallback = fallback_description_from_group(group_title)
    if topic_fallback:
        return topic_fallback
    if parts:
        return f"Inneholder {len(items)} deler: {', '.join(parts[:4])}{' ...' if len(parts) > 4 else ''}."
    return ""


def apply_group_descriptions(videos: list[dict[str, Any]], provider: str, ollama_model: str, openrouter_model: str, openrouter_api_key: str, existing_group_descriptions: dict[str, str] | None = None, only_refresh_weak_fields: bool = False) -> list[dict[str, Any]]:
    grouped: dict[str, list[dict[str, Any]]] = {}
    for item in videos:
        key = normalize_group_key(item.get("group", "") or item.get("title", ""))
        grouped.setdefault(key, []).append(item)

    existing_group_descriptions = existing_group_descriptions or {}
    descriptions: dict[str, str] = {}
    for key, items in grouped.items():
        group_title = clean_group_label(items[0].get("group", "") or items[0].get("title", ""))
        preserved = str(existing_group_descriptions.get(key, "") or "")
        if preserved and only_refresh_weak_fields and not group_description_needs_improvement(preserved, group_title):
            descriptions[key] = preserved
            continue
        rebuilt = build_group_description(group_title, items, provider, ollama_model, openrouter_model, openrouter_api_key)
        descriptions[key] = rebuilt or preserved

    out: list[dict[str, Any]] = []
    for item in videos:
        key = normalize_group_key(item.get("group", "") or item.get("title", ""))
        enriched_item = dict(item)
        enriched_item["group_description"] = descriptions.get(key, "")
        out.append(enriched_item)
    return out


def enrich(items: list[dict[str, Any]], ai_provider: str = "heuristic", ollama_model: str = "llama3.1:8b", openrouter_model: str = "openrouter/free", openrouter_api_key: str = "", cookies_file: str | None = None, cookies_from_browser: str | None = None, transcribe_with_whisper: bool = False, whisper_model: str = "small", existing_by_url: dict[str, dict[str, Any]] | None = None, existing_group_descriptions: dict[str, str] | None = None, preserve_title_grouping: bool = False, only_refresh_weak_fields: bool = False, strict_ai: bool = False) -> list[dict[str, Any]]:
    enriched: list[dict[str, Any]] = []
    existing_by_url = existing_by_url or {}
    existing_group_descriptions = existing_group_descriptions or {}

    for item in items:
        url = item.get("url", "")
        existing_item = existing_by_url.get(url, {})

        raw_title = existing_item.get("title") or item.get("title") or item.get("url", "")
        raw_description = existing_item.get("description") if "description" in existing_item else item.get("description", "")
        raw_themes = list(existing_item.get("themes") or item.get("themes", []) or [])
        raw_group = existing_item.get("group") or item.get("group", "") or item.get("group_title", "") or ""
        raw_part = existing_item.get("part") or item.get("part", "") or item.get("part_label", "") or ""

        title = raw_title
        description = raw_description
        themes = normalize_themes(raw_themes)
        existing_group = raw_group
        existing_part = raw_part

        title_locked = preserve_title_grouping and bool(existing_item.get("title"))
        group_locked = preserve_title_grouping and bool(existing_group) and not group_title_needs_refresh(existing_group)
        part_locked = preserve_title_grouping and bool(existing_part)

        title_needs_refresh = looks_like_placeholder_title(title) and not title_locked
        description_needs_refresh = looks_like_generic_description(description, title=title, group=existing_group)
        themes_needs_refresh = themes_need_improvement(themes)
        title_needs_refresh_initial = title_needs_refresh
        description_needs_refresh_initial = description_needs_refresh
        themes_needs_refresh_initial = themes_needs_refresh
        needs_better_text = title_needs_refresh or description_needs_refresh or themes_needs_refresh

        source_meta: dict[str, Any] = {}
        if needs_better_text or (not group_locked) or (not part_locked):
            source_meta = run_yt_dlp_metadata(url, cookies_file=cookies_file, cookies_from_browser=cookies_from_browser)
            merged_title, merged_description, merged_themes = merge_source_metadata(title, description, themes, source_meta)
            if title_needs_refresh and merged_title and not title_locked:
                title = merged_title
            if description_needs_refresh and merged_description:
                description = merged_description
                description_needs_refresh = looks_like_generic_description(description, title=title, group=existing_group)
            if themes_needs_refresh and merged_themes:
                themes = merged_themes
                themes_needs_refresh = themes_need_improvement(themes)

        txt = ""
        if needs_better_text:
            with tempfile.TemporaryDirectory() as tmp:
                raw_subs = run_yt_dlp_subtitles(url, Path(tmp), cookies_file=cookies_file, cookies_from_browser=cookies_from_browser)
            txt = subtitle_to_text(raw_subs)
            if not txt and transcribe_with_whisper:
                with tempfile.TemporaryDirectory() as tmp2:
                    txt = transcribe_with_whisper_cli(url, Path(tmp2), cookies_file=cookies_file, cookies_from_browser=cookies_from_browser, model=whisper_model)

        ai_out = None
        if ai_provider in {"ollama", "openrouter"}:
            analysis_text = txt.strip() or " ".join(
                x for x in [
                    source_meta.get("title", ""),
                    source_meta.get("description", ""),
                    " ".join(source_meta.get("tags", [])[:10]),
                ] if x
            ).strip()
            if analysis_text:
                try:
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
                except OpenRouterRateLimitError as exc:
                    if strict_ai:
                        raise RuntimeError(f"OpenRouter rate limit for {url}: {exc}") from exc
                    print(f"[WARN] OpenRouter rate limit for {url}. Faller tilbake til heuristikk.", file=sys.stderr)
                    ai_out = None
                if not ai_out:
                    if strict_ai:
                        raise RuntimeError(f"{ai_provider} klassifisering feilet for {url}")
                    print(f"[WARN] {ai_provider} klassifisering feilet for {url}. Faller tilbake til heuristikk.", file=sys.stderr)
            elif strict_ai:
                raise RuntimeError(f"Mangler tekstgrunnlag for AI-klassifisering for {url}")

        if ai_out:
            ai_title = clean_group_label(ai_out.get("title", ""))
            ai_desc = clean_group_label(ai_out.get("description", ""))
            ai_themes = normalize_themes(ai_out.get("themes", []) or [])
            ai_group = clean_group_label(ai_out.get("group_title", ""))
            ai_part = clean_group_label(ai_out.get("part_label", ""))
            if title_needs_refresh and ai_title and not title_locked:
                title = ai_title
            if description_needs_refresh and ai_desc:
                description = ai_desc
                description_needs_refresh = looks_like_generic_description(description, title=title, group=existing_group)
            if themes_needs_refresh and ai_themes:
                themes = ai_themes
                themes_needs_refresh = themes_need_improvement(themes)
            if not group_locked and ai_group:
                existing_group = merge_group_title_with_prefix(existing_group, ai_group)
            if not part_locked and not existing_part and ai_part:
                existing_part = ai_part
        elif txt:
            if description_needs_refresh:
                description = make_description(txt)
                description_needs_refresh = looks_like_generic_description(description, title=title, group=existing_group)
            if themes_needs_refresh:
                themes = extract_themes(txt)
                themes_needs_refresh = themes_need_improvement(themes)

        if themes_needs_refresh:
            fallback_text = " ".join(
                x for x in [
                    title,
                    description,
                    existing_group,
                    existing_part,
                    source_meta.get("title", ""),
                    source_meta.get("description", ""),
                    " ".join(source_meta.get("tags", [])[:8]),
                ] if x
            ).strip()
            if fallback_text:
                themes = extract_themes(fallback_text, k=6)

        if description_needs_refresh:
            fallback_text = " ".join(
                x for x in [
                    description,
                    source_meta.get("description", ""),
                    title,
                    existing_group,
                    existing_part,
                ] if x
            ).strip()
            if fallback_text:
                description = make_description(fallback_text)

        group, part = derive_group_and_part(title, description, existing_group, existing_part)
        if looks_like_generic_description(description, title=title, group=existing_group or group):
            topic_fallback = fallback_description_from_group(existing_group or group, existing_part or part)
            if topic_fallback:
                description = topic_fallback

        final_title = raw_title if (existing_item and not title_needs_refresh_initial) else clean_group_label(title)
        final_description = raw_description if (existing_item and not description_needs_refresh_initial) else clean_group_label(description)
        final_themes = raw_themes if (existing_item and not themes_needs_refresh_initial) else normalize_themes(themes)
        final_group = raw_group if (existing_item and group_locked) else clean_group_label(existing_group or group)
        final_part = raw_part if (existing_item and part_locked) else clean_group_label(existing_part or part)
        enriched.append({
            "title": final_title,
            "url": url,
            "description": final_description,
            "themes": final_themes,
            "group": final_group,
            "part": final_part,
        })

    return apply_group_descriptions(
        enriched,
        ai_provider,
        ollama_model,
        openrouter_model,
        openrouter_api_key,
        existing_group_descriptions=existing_group_descriptions,
        only_refresh_weak_fields=only_refresh_weak_fields,
    )


def main() -> None:
    load_local_env()
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
    ap.add_argument("--existing-json", default=None, help="Eksisterende Forelesning.json som brukes som fasit for title/group/part")
    ap.add_argument(
        "--process-url",
        action="append",
        default=[],
        help="Prosesser bare denne URL-en. Kan oppgis flere ganger for en liten batch.",
    )
    ap.add_argument(
        "--max-items",
        type=int,
        default=0,
        help="Maks antall videoer som skal prosesseres i denne kjøringen. 0 betyr alle valgte.",
    )
    ap.add_argument(
        "--preserve-title-grouping",
        action="store_true",
        help="Bevar eksisterende title/group/part fra --existing-json og oppdater bare beskrivelser/tags",
    )
    ap.add_argument(
        "--only-refresh-weak-fields",
        action="store_true",
        help="Oppdater bare felt som ser svake eller generiske ut",
    )
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
    ap.add_argument(
        "--strict-ai",
        action="store_true",
        help="Avbryt kjoringen hvis AI ikke svarer, i stedet for a falle tilbake til heuristikk.",
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

    if (args.only_refresh_weak_fields or args.process_url or args.max_items) and not args.existing_json:
        print(
            "[FEIL] --existing-json kreves nar du bruker batch/weak-refresh, slik at uendrede videoer kan bevares i output.",
            file=sys.stderr,
        )
        sys.exit(2)

    inp = Path(args.input)
    out = Path(args.output)
    existing_by_url, existing_group_descriptions = load_existing_output(Path(args.existing_json)) if args.existing_json else ({}, {})

    items = parse_playlist(inp)
    selected_items = select_items_for_enrichment(
        items,
        existing_by_url=existing_by_url,
        existing_group_descriptions=existing_group_descriptions,
        process_urls=args.process_url,
        max_items=args.max_items,
        only_refresh_weak_fields=args.only_refresh_weak_fields,
        preserve_title_grouping=args.preserve_title_grouping,
    )
    print(f"[INFO] Valgte {len(selected_items)} av {len(items)} videoer for denne kjoringen.", file=sys.stderr)

    videos = enrich(
        selected_items,
        ai_provider=args.ai_provider,
        ollama_model=args.ollama_model,
        openrouter_model=args.openrouter_model,
        openrouter_api_key=args.openrouter_api_key,
        cookies_file=args.cookies,
        cookies_from_browser=args.cookies_from_browser,
        transcribe_with_whisper=args.transcribe_with_whisper,
        whisper_model=args.whisper_model,
        existing_by_url=existing_by_url,
        existing_group_descriptions=existing_group_descriptions,
        preserve_title_grouping=args.preserve_title_grouping,
        only_refresh_weak_fields=args.only_refresh_weak_fields,
        strict_ai=args.strict_ai,
    )
    if len(selected_items) != len(items):
        videos = merge_enriched_subset(items, videos, existing_by_url=existing_by_url)
    out.write_text(json.dumps({"videos": videos}, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Skrev {len(videos)} videoer til {out}")


if __name__ == "__main__":
    main()
