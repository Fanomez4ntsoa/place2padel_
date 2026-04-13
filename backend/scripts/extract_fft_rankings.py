#!/usr/bin/env python3
"""
extract_fft_rankings.py — One-shot scraper FFT padel rankings (PadelSpeak PDFs).

Télécharge les classements H + F du mois cible (auto-détection du dernier publié),
parse via PyMuPDF, génère un CSV unique compatible LOAD DATA INFILE MySQL.

Usage :
    pip install --user pymupdf requests
    python3 backend/scripts/extract_fft_rankings.py
    python3 backend/scripts/extract_fft_rankings.py --year 2026 --month 3
    python3 backend/scripts/extract_fft_rankings.py --output custom/path.csv

Sortie : database/seeders/data/fft_rankings.csv
Colonnes : name, first_name, last_name, ranking, points, evolution,
           gender, country, region, updated_at
"""

import argparse
import csv
import gc
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import fitz  # PyMuPDF
import requests

PADELSPEAK_BASE = "https://padelspeak.com/wp-content/uploads"
MONTHS_FR = {
    1: "janvier", 2: "fevrier", 3: "mars", 4: "avril",
    5: "mai", 6: "juin", 7: "juillet", 8: "aout",
    9: "septembre", 10: "octobre", 11: "novembre", 12: "decembre",
}

CSV_HEADER = [
    "name", "first_name", "last_name", "ranking", "points",
    "evolution", "gender", "country", "region", "updated_at",
]


def pdf_url(year: int, month: int, gender: str) -> str:
    """gender: 'homme' | 'femme' (URL convention PadelSpeak)."""
    return f"{PADELSPEAK_BASE}/classement_padel_france_{gender}_{year}_{month:02d}_{MONTHS_FR[month]}.pdf"


def detect_latest_month() -> tuple[int, int]:
    """Walk back from current month until both H + F PDFs are 200 OK."""
    today = datetime.now(timezone.utc)
    year, month = today.year, today.month
    for _ in range(12):
        url_h = pdf_url(year, month, "homme")
        url_f = pdf_url(year, month, "femme")
        ok_h = requests.head(url_h, timeout=10).status_code == 200
        ok_f = requests.head(url_f, timeout=10).status_code == 200
        if ok_h and ok_f:
            return year, month
        # walk back
        month -= 1
        if month == 0:
            month = 12
            year -= 1
    raise RuntimeError("No FFT PDF found in the last 12 months on PadelSpeak.")


def download(url: str, dest: Path) -> None:
    print(f"  Downloading {url}", flush=True)
    r = requests.get(url, timeout=120, stream=True)
    r.raise_for_status()
    with dest.open("wb") as f:
        for chunk in r.iter_content(chunk_size=64 * 1024):
            f.write(chunk)
    print(f"  Saved {dest} ({dest.stat().st_size / 1024:.0f} KB)", flush=True)


def extract_pdf(pdf_path: Path, gender: str, updated_at: str) -> list[dict]:
    """Parse PDF tables → rows. Reuses Emergent's seed_rankings.py logic."""
    doc = fitz.open(pdf_path)
    total_pages = len(doc)
    print(f"[{gender}] {total_pages} pages", flush=True)

    rows: list[dict] = []
    start = time.time()

    for page_num in range(total_pages):
        page = doc.load_page(page_num)
        try:
            tabs = page.find_tables()
            if not tabs or not tabs.tables:
                continue
            data = tabs.tables[0].extract()
        except Exception:
            continue

        for row in data:
            if not row or len(row) < 6:
                continue

            # Strip newlines from every cell — certains PDFs injectent \n
            # dans les noms/régions, ça casse LOAD DATA INFILE MySQL.
            row = [c.replace("\n", " ").replace("\r", " ") if isinstance(c, str) else c for c in row]

            rank = (row[0] or "").strip()
            if rank == "#" or not rank:
                continue
            rank_clean = rank.replace("*", "").replace(" ", "").replace("\xa0", "").strip()
            ranking_int = int(rank_clean) if rank_clean.isdigit() else None

            last_name = (row[2] or "").strip()
            first_name = (row[3] or "").strip()
            if not last_name:
                continue

            points_str = (row[4] or "").strip().replace(" ", "").replace("\xa0", "")
            points = 0
            if points_str and points_str != "-":
                try:
                    points = int(points_str)
                except ValueError:
                    pass

            country = (row[5] or "").strip() or "FR"
            region = (row[8] or "").strip() if len(row) > 8 else ""
            evolution = (row[1] or "").strip()
            name = f"{first_name} {last_name}".strip()

            rows.append({
                "name": name,
                "first_name": first_name,
                "last_name": last_name,
                "ranking": ranking_int if ranking_int is not None else "",
                "points": points,
                "evolution": evolution,
                "gender": gender,
                "country": country[:2],  # CHAR(2) MySQL
                "region": region,
                "updated_at": updated_at,
            })

        if page_num and page_num % 500 == 0:
            elapsed = time.time() - start
            rate = page_num / elapsed
            eta = (total_pages - page_num) / rate
            print(f"  [{gender}] {page_num}/{total_pages} ({len(rows)} rows, ETA {eta:.0f}s)", flush=True)

    doc.close()
    gc.collect()
    elapsed = time.time() - start
    print(f"  [{gender}] DONE: {len(rows)} rows in {elapsed:.0f}s", flush=True)
    return rows


def write_csv(path: Path, rows: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as f:
        # QUOTE_ALL → robust pour LOAD DATA INFILE (commas dans noms, etc.)
        w = csv.DictWriter(f, fieldnames=CSV_HEADER, quoting=csv.QUOTE_ALL)
        w.writeheader()
        w.writerows(rows)
    size_mb = path.stat().st_size / (1024 * 1024)
    print(f"\nWrote {path} ({len(rows)} rows, {size_mb:.1f} MB)", flush=True)


def main() -> int:
    parser = argparse.ArgumentParser(description="Extract FFT padel rankings into CSV.")
    parser.add_argument("--year", type=int, default=None)
    parser.add_argument("--month", type=int, default=None, choices=range(1, 13))
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(__file__).resolve().parent.parent / "database/seeders/data/fft_rankings.csv",
    )
    parser.add_argument("--tmp", type=Path, default=Path("/tmp"))
    args = parser.parse_args()

    if args.year and args.month:
        year, month = args.year, args.month
        print(f"Using forced {year}-{month:02d}", flush=True)
    else:
        print("Detecting latest available month on PadelSpeak…", flush=True)
        year, month = detect_latest_month()
        print(f"Latest = {year}-{month:02d} ({MONTHS_FR[month]})", flush=True)

    # Format MySQL TIMESTAMP (LOAD DATA INFILE compatible)
    updated_at = datetime(year, month, 1, tzinfo=timezone.utc).strftime("%Y-%m-%d %H:%M:%S")

    pdf_h = args.tmp / f"fft_homme_{year}_{month:02d}.pdf"
    pdf_f = args.tmp / f"fft_femme_{year}_{month:02d}.pdf"

    print("\n=== Download ===", flush=True)
    download(pdf_url(year, month, "homme"), pdf_h)
    download(pdf_url(year, month, "femme"), pdf_f)

    print("\n=== Parse ===", flush=True)
    rows = extract_pdf(pdf_h, "masculin", updated_at) + extract_pdf(pdf_f, "feminin", updated_at)

    print("\n=== Write CSV ===", flush=True)
    write_csv(args.output, rows)

    return 0


if __name__ == "__main__":
    sys.exit(main())
