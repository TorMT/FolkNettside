from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Iterable, List

try:
    from pypdf import PdfReader, PdfWriter
except Exception:
    PdfReader = None
    PdfWriter = None


def ensure_command_exists(cmd: str) -> None:
    if shutil.which(cmd) is None:
        raise RuntimeError(
            f"Fant ikke '{cmd}' i PATH.\n\n"
            "Fix:\n"
            "  python -m pip install ocrmypdf\n\n"
            "Hvis du fortsatt får feil, kjør:\n"
            "  python -m pip show ocrmypdf\n"
            "  where ocrmypdf\n"
        )


def find_by_names(root: Path, names: Iterable[str]) -> List[Path]:
    wanted = set(names)
    hits: List[Path] = []
    for p in root.rglob("*.pdf"):
        if p.name in wanted:
            hits.append(p)
    return sorted(hits)


def find_by_glob(root: Path, pattern: str) -> List[Path]:
    return sorted([p for p in root.glob(pattern) if p.is_file() and p.suffix.lower() == ".pdf"])


def run_ocrmypdf(
    in_pdf: Path,
    out_pdf: Path,
    lang: str = "nor+eng",
    optimize: int = 3,
    deskew: bool = True,
    rotate_pages: bool = True,
    force_ocr: bool = True,
    verbose: bool = False,
) -> None:
    cmd = [
        "ocrmypdf",
        "--output-type", "pdf",
        "--language", lang,
        "--optimize", str(optimize),
    ]
    if deskew:
        cmd.append("--deskew")
    if rotate_pages:
        cmd.append("--rotate-pages")
    if force_ocr:
        cmd.append("--force-ocr")

    cmd += [str(in_pdf), str(out_pdf)]

    if verbose:
        # Vis output live
        proc = subprocess.run(cmd)
        if proc.returncode != 0:
            raise RuntimeError(f"OCR feilet for: {in_pdf}\ncmd: {' '.join(cmd)}")
    else:
        proc = subprocess.run(cmd, capture_output=True, text=True)
        if proc.returncode != 0:
            raise RuntimeError(
                f"OCR feilet for: {in_pdf}\n"
                f"cmd: {' '.join(cmd)}\n"
                f"stdout:\n{proc.stdout}\n"
                f"stderr:\n{proc.stderr}\n"
            )


def safe_replace(original: Path, new_file: Path, backup_suffix: str = ".bak.pdf") -> Path:
    backup = original.with_name(original.name + backup_suffix)

    if backup.exists():
        i = 1
        while True:
            cand = original.with_name(original.name + f".bak{i}.pdf")
            if not cand.exists():
                backup = cand
                break
            i += 1

    shutil.copy2(original, backup)
    shutil.move(str(new_file), str(original))
    return backup


def combine_pdfs(pdf_paths: List[Path], out_path: Path) -> None:
    if PdfReader is None or PdfWriter is None:
        raise RuntimeError("Mangler pypdf. Installer med: python -m pip install pypdf")

    writer = PdfWriter()
    for p in pdf_paths:
        reader = PdfReader(str(p))
        for page in reader.pages:
            writer.add_page(page)

    out_path.parent.mkdir(parents=True, exist_ok=True)
    with out_path.open("wb") as f:
        writer.write(f)


def main() -> int:
    ap = argparse.ArgumentParser(description="OCR på PDF-er og erstatt originalene (med backup).")
    ap.add_argument("--root", type=str, default=".", help="Rotmappe å søke i (rekursivt).")

    group = ap.add_mutually_exclusive_group(required=True)
    group.add_argument("--files", nargs="+", help="Eksakte filnavn (kun navn, ikke sti).")
    group.add_argument("--glob", type=str, help="Glob-mønster relativt til root, f.eks. '**/Kap*.pdf'")

    ap.add_argument("--lang", type=str, default="nor+eng", help="OCR-språk, f.eks. 'nor+eng'")
    ap.add_argument("--optimize", type=int, default=3, choices=[0, 1, 2, 3], help="0=ingen, 3=maks")
    ap.add_argument("--no-deskew", action="store_true", help="Skru av deskew")
    ap.add_argument("--no-rotate", action="store_true", help="Skru av auto-rotate")
    ap.add_argument("--no-force-ocr", action="store_true", help="Skru av force-ocr")
    ap.add_argument("--backup-suffix", type=str, default=".bak.pdf", help="Suffix for backup")
    ap.add_argument("--combine", type=str, default=None, help="Lag samlet PDF av de OCR-oppdaterte filene")
    ap.add_argument("--verbose", action="store_true", help="Vis ocrmypdf-output live")

    args = ap.parse_args()
    root = Path(args.root).expanduser().resolve()

    if not root.exists():
        print(f"Fant ikke root: {root}", file=sys.stderr)
        return 2

    ensure_command_exists("ocrmypdf")

    if args.files:
        targets = find_by_names(root, args.files)
        missing = sorted(set(args.files) - {p.name for p in targets})
        if missing:
            print("Disse filnavnene ble ikke funnet:", file=sys.stderr)
            for m in missing:
                print("  -", m, file=sys.stderr)
            return 3
    else:
        targets = find_by_glob(root, args.glob)
        if not targets:
            print(f"Ingen PDF-er matchet glob: {args.glob}", file=sys.stderr)
            return 4

    updated_paths: List[Path] = []

    for pdf in targets:
        tmp_out = pdf.with_suffix(".ocr_tmp.pdf")

        print(f"OCR: {pdf}")
        run_ocrmypdf(
            in_pdf=pdf,
            out_pdf=tmp_out,
            lang=args.lang,
            optimize=args.optimize,
            deskew=not args.no_deskew,
            rotate_pages=not args.no_rotate,
            force_ocr=not args.no_force_ocr,
            verbose=args.verbose,
        )

        backup = safe_replace(pdf, tmp_out, backup_suffix=args.backup_suffix)
        print(f"  -> erstattet. Backup: {backup}")
        updated_paths.append(pdf)

    if args.combine:
        out_combined = (root / args.combine).resolve() if not Path(args.combine).is_absolute() else Path(args.combine)
        print(f"Lager samlet PDF: {out_combined}")
        combine_pdfs(updated_paths, out_combined)

    print("Ferdig.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
