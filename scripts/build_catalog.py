#!/usr/bin/env python3
"""Build the JavaScript data catalog for the Free-TV Player web app.

Reads two upstream sources that are vendored in this repository:

  1. Free-TV curated markdown channel lists ............ lists/*.md
     (same files the original ``make_playlist.py`` pipeline consumes)
  2. iptv-org per-country M3U stream files ............. sources/iptv-org/streams/*.m3u

and emits self-contained, dependency-free JavaScript data modules under
``app/data/``:

  app/data/catalog.js          country/category index + the Free-TV "featured" set
  app/data/channels-<key>.js   every channel for one country or category list
  app/data/channels-all.js     the full merged catalog (used by global search)

The modules are plain ``<script>`` targets (``window.FREETV_CATALOG`` /
``window.FREETV_CHANNELS``) so the app also works when opened directly from
disk (``file://``), not only from GitHub Pages.

The build is deterministic: the same inputs always produce the same catalog; only the
generated-at date stamp moves with the calendar day.

Usage:
    python3 scripts/build_catalog.py
    python3 scripts/build_catalog.py --quiet
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from datetime import datetime, timezone

try:
    import pycountry
except ImportError:  # pragma: no cover
    sys.exit("pycountry is required: pip install pycountry")

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LISTS_DIR = os.path.join(BASE_DIR, "lists")
ORG_DIR = os.path.join(BASE_DIR, "sources", "iptv-org", "streams")
OUT_DIR = os.path.join(BASE_DIR, "app", "data")

SOURCE_FTV = "ftv"
SOURCE_ORG = "org"
FTV_LIST_URL = "https://github.com/Free-TV/IPTV/blob/master/lists/{key}.md"
ORG_LIST_URL = "https://github.com/iptv-org/iptv/blob/master/streams/{key}.m3u"

# Free-TV list key -> ISO 3166-1 alpha-2 (mirrors make_playlist.py COUNTRY_CODES)
FTV_KEY_TO_CODE = {
    "albania": "AL", "andorra": "AD", "argentina": "AR", "armenia": "AM",
    "australia": "AU", "austria": "AT", "azerbaijan": "AZ", "belarus": "BY",
    "belgium": "BE", "bosnia_and_herzegovina": "BA", "brazil": "BR",
    "bulgaria": "BG", "canada": "CA", "chad": "TD", "chile": "CL",
    "china": "CN", "costa_rica": "CR", "croatia": "HR", "cyprus": "CY",
    "czech_republic": "CZ", "denmark": "DK", "dominican_republic": "DO",
    "egypt": "EG", "estonia": "EE", "faroe_islands": "FO", "finland": "FI",
    "france": "FR", "georgia": "GE", "germany": "DE", "greece": "GR",
    "greenland": "GL", "hong_kong": "HK", "hongkong": "HK", "hungary": "HU",
    "iceland": "IS", "india": "IN", "indonesia": "ID", "iran": "IR",
    "iraq": "IQ", "ireland": "IE", "israel": "IL", "italy": "IT",
    "japan": "JP", "kazakhstan": "KZ", "kenya": "KE", "korea": "KR",
    "kosovo": "XK", "latvia": "LV", "lithuania": "LT", "luxembourg": "LU",
    "macau": "MO", "malta": "MT", "mexico": "MX", "moldova": "MD",
    "monaco": "MC", "mongolia": "MN", "montenegro": "ME", "netherlands": "NL",
    "nigeria": "NG", "north_korea": "KP", "north_macedonia": "MK",
    "norway": "NO", "paraguay": "PY", "peru": "PE", "poland": "PL",
    "portugal": "PT", "qatar": "QA", "romania": "RO", "russia": "RU",
    "san_marino": "SM", "saudi_arabia": "SA", "serbia": "RS", "slovakia": "SK",
    "slovenia": "SI", "somalia": "SO", "spain": "ES", "spain_vod": "ES",
    "sweden": "SE", "switzerland": "CH", "taiwan": "TW", "trinidad": "TT",
    "turkey": "TR", "turkmenistan": "TM", "uk": "GB", "ukraine": "UA",
    "united_arab_emirates": "AE", "usa": "US", "usa_vod": "US",
    "venezuela": "VE",
}

# Themed Free-TV lists (zz_*) rendered as categories instead of countries.
FTV_CATEGORY_LABELS = {
    "zz_movies": "Movies",
    "zz_documentaries_en": "Documentaries (EN)",
    "zz_documentaries_ar": "Documentaries (AR)",
    "zz_news_en": "News (EN)",
    "zz_news_ar": "News (AR)",
    "zz_news_es": "News (ES)",
    "zz_music_en": "Music (EN)",
    "zz_vod_it": "VOD (IT)",
}

# iptv-org names the United Kingdom file "uk.m3u" (nonstandard); ISO alpha-2 is GB.
ORG_CODE_FIX = {"uk": "gb"}

# Friendlier display names for ISO codes pycountry renders awkwardly.
COUNTRY_NAME_OVERRIDES = {
    "US": "United States", "GB": "United Kingdom", "TW": "Taiwan",
    "KR": "South Korea", "KP": "North Korea", "MO": "Macau",
    "BO": "Bolivia", "VE": "Venezuela", "VN": "Vietnam", "RU": "Russia",
    "SY": "Syria", "IR": "Iran", "LA": "Laos", "MD": "Moldova",
    "TZ": "Tanzania", "BN": "Brunei", "CD": "DR Congo", "VA": "Vatican City",
    "AE": "United Arab Emirates", "PS": "Palestine", "CI": "Côte d'Ivoire",
    "SZ": "Eswatini", "MM": "Myanmar", "CZ": "Czechia", "MK": "North Macedonia",
    "HK": "Hong Kong", "XK": "Kosovo", "TL": "Timor-Leste",
}

CIRCLED = re.compile(r"[\u24b6-\u24e9]+")
QUALITY = re.compile(r"\((\d{3,4}p(?:\d+)?)\)\s*$")
ATTR = re.compile(r'([\w-]+)="([^"]*)"')
TAG_BRACKETS = re.compile(r"\[([^\]]+)\]\s*$")


# --------------------------------------------------------------------------- #
# Free-TV markdown lists
# --------------------------------------------------------------------------- #
def strip_tags(html: str) -> str:
    return re.sub(r"<[^<>]+>", "", html).strip()


def parse_ftv_cell(cell: str) -> str:
    """Extract a URL from a markdown link cell like ``[>](https://...)``."""
    cell = cell.strip()
    start, end = cell.find("("), cell.rfind(")")
    return cell[start + 1 : end] if start != -1 and end > start else cell


def parse_ftv_logo(cell: str) -> str | None:
    """Extract the src URL from an ``<img ...>`` logo cell."""
    match = re.search(r'src="([^"]+)"', cell)
    return match.group(1) if match else None


def marker_tags(name: str) -> tuple[str, list[str]]:
    """Split circled-letter markers (Ⓖ Ⓢ Ⓨ Ⓣ ...) off a channel name."""
    letters = "".join(CIRCLED.findall(name))
    clean = CIRCLED.sub(" ", name)
    clean = re.sub(r"\s{2,}", " ", clean).strip()
    known = {"G": "geo", "S": "sd", "Y": "youtube", "T": "twitch", "V": "vpn"}
    tags = [known.get(letter, "m" + letter.lower()) for letter in letters]
    return clean, tags


def read_ftv_lists() -> tuple[list[dict], dict[str, list[dict]]]:
    """Parse every lists/*.md file; return (all_channels, by_list_key)."""
    channels: list[dict] = []
    by_key: dict[str, list[dict]] = {}
    if not os.path.isdir(LISTS_DIR):
        return channels, by_key

    for filename in sorted(os.listdir(LISTS_DIR)):
        if not filename.endswith(".md"):
            continue
        key = filename[:-3]
        group = key.replace("_", " ").title()
        section = None
        code = FTV_KEY_TO_CODE.get(key, "")
        with open(os.path.join(LISTS_DIR, filename), encoding="utf-8") as handle:
            for line in handle:
                low = line.lower()
                if "<h1>" in low and "</h1>" in low:
                    group = strip_tags(line.strip())
                    continue
                if "<h2>" in low and "</h2>" in low:
                    section = strip_tags(line.strip())
                    continue
                if "[>]" not in line or not line.lstrip().startswith("|"):
                    continue
                parts = line.split("|")
                if len(parts) < 5:
                    continue
                number = parts[1].strip().replace('"', "")
                name_raw = parts[2].strip().replace('"', "")
                url = parse_ftv_cell(parts[3])
                logo = parse_ftv_logo(parts[4])
                epg = parts[5].strip().replace('"', "") if len(parts) > 5 else ""
                if not url:
                    continue
                name, tags = marker_tags(name_raw)
                ch = {
                    "n": name or name_raw,
                    "r": name_raw,
                    "u": url,
                    "l": logo,
                    "id": epg or None,
                    "c": code.lower() or None,
                    "s": SOURCE_FTV,
                    "k": key,
                    "g": group,
                    "sec": section,
                    "ch": number if number and number != "0" else None,
                }
                if tags:
                    ch["t"] = tags
                if "youtube" in url or "twitch.tv" in url:
                    ch["y"] = True
                channels.append(ch)
                by_key.setdefault(key, []).append(ch)
    return channels, by_key


# --------------------------------------------------------------------------- #
# iptv-org M3U streams
# --------------------------------------------------------------------------- #
def provider_label(key: str) -> str | None:
    """us_pluto -> 'Pluto TV'; plain country files have no provider."""
    suffix = key.split("_", 1)[1] if "_" in key else None
    if not suffix:
        return None
    named = {
        "pluto": "Pluto TV", "samsung": "Samsung TV Plus", "stingray": "Stingray",
        "nexgen": "Nexgen", "morescreens": "Morescreens",
    }
    return named.get(suffix, suffix.replace("_", " ").title())


def read_org_streams() -> tuple[list[dict], dict[str, list[dict]]]:
    """Parse every sources/iptv-org/streams/*.m3u file."""
    channels: list[dict] = []
    by_code: dict[str, list[dict]] = {}
    if not os.path.isdir(ORG_DIR):
        return channels, by_code

    for filename in sorted(os.listdir(ORG_DIR)):
        if not filename.endswith(".m3u"):
            continue
        key = filename[:-4]
        raw_code = key.split("_", 1)[0].lower()
        code = ORG_CODE_FIX.get(raw_code, raw_code)
        provider = provider_label(key)
        label = provider or "iptv-org"
        with open(os.path.join(ORG_DIR, filename), encoding="utf-8") as handle:
            pending: dict | None = None
            for raw in handle:
                line = raw.strip()
                if not line:
                    continue
                if line.startswith("#EXTINF"):
                    attrs = dict(ATTR.findall(line))
                    display = line.split(",", 1)[1].strip() if "," in line else ""
                    name = display
                    tags: list[str] = []
                    quality = None
                    match = QUALITY.search(display)
                    if match:
                        quality = match.group(1)
                        name = display[: match.start()].strip()
                    bracket = TAG_BRACKETS.search(name)
                    if bracket and bracket.group(1).lower() in ("geo-blocked", "not 24/7"):
                        tags.append("not247" if bracket.group(1).lower() == "not 24/7" else "geo")
                        name = name[: bracket.start()].strip()
                    pending = {
                        "n": name or display,
                        "r": display,
                        "u": None,
                        "l": attrs.get("tvg-logo"),
                        "id": attrs.get("tvg-id"),
                        "c": code,
                        "s": SOURCE_ORG,
                        "k": key,
                        "g": attrs.get("group-title") or label,
                        "q": quality,
                    }
                    if tags:
                        pending["t"] = tags
                    continue
                if pending is not None and not line.startswith("#"):
                    pending["u"] = line
                    channels.append(pending)
                    by_code.setdefault(code, []).append(pending)
                    pending = None
    return channels, by_code


# --------------------------------------------------------------------------- #
# Merge + emit
# --------------------------------------------------------------------------- #
def country_name(code: str) -> str:
    if not code:
        return "International"
    if code.upper() in COUNTRY_NAME_OVERRIDES:
        return COUNTRY_NAME_OVERRIDES[code.upper()]
    country = pycountry.countries.get(alpha_2=code.upper())
    return country.name if country else code.upper()


def dedupe(channels: list[dict]) -> list[dict]:
    seen: set[tuple[str, str]] = set()
    out: list[dict] = []
    for ch in channels:
        key = ((ch["n"] or "").casefold(), ch["u"] or "")
        if key in seen:
            continue
        seen.add(key)
        out.append(ch)
    return out


def js_record(ch: dict) -> dict:
    keep = ("n", "r", "u", "l", "id", "c", "s", "k", "g", "sec", "ch", "q", "t", "y")
    return {k: ch[k] for k in keep if ch.get(k) not in (None, "", False, [])}


def dumps(obj) -> str:
    """JSON for embedding in a <script> tag (escape ``</``)."""
    return json.dumps(obj, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")


def write_js(filename: str, body: str) -> None:
    with open(os.path.join(OUT_DIR, filename), "w", encoding="utf-8") as handle:
        handle.write("/* Generated by scripts/build_catalog.py — do not edit. */\n")
        handle.write(body + "\n")


def main() -> None:  # pylint: disable=too-many-locals
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--quiet", action="store_true", help="only print the summary line")
    args = parser.parse_args()

    os.makedirs(OUT_DIR, exist_ok=True)
    ftv_all, ftv_by_key = read_ftv_lists()
    org_all, org_by_code = read_org_streams()

    # featured = the Free-TV curated set, in original list order
    featured = [js_record(ch) for ch in ftv_all]

    # merge per country code (Free-TV first, then iptv-org, deduped)
    merged: dict[str, list[dict]] = {}
    for ch in ftv_all:
        code = (ch.get("c") or "").lower()
        if code:
            merged.setdefault(code, []).append(ch)
    for code, chans in sorted(org_by_code.items()):
        merged.setdefault(code, []).extend(chans)
    for code in merged:
        merged[code] = [js_record(ch) for ch in dedupe(merged[code])]

    # themed category lists (zz_*)
    categories: list[dict] = []
    for key in sorted(FTV_CATEGORY_LABELS):
        chans = ftv_by_key.get(key, [])
        if chans:
            categories.append({
                "key": "cat-" + key, "label": FTV_CATEGORY_LABELS[key],
                "count": len(chans),
            })
            write_js(
                f"channels-cat-{key}.js",
                'window.FREETV_CHANNELS=window.FREETV_CHANNELS||{};'
                f'window.FREETV_CHANNELS["cat-{key}"]={dumps([js_record(c) for c in chans])};',
            )
    # VOD lists are country pages, keep them addressable too
    for key in ("spain_vod", "usa_vod"):
        chans = ftv_by_key.get(key, [])
        if chans:
            write_js(
                f"channels-{key}.js",
                'window.FREETV_CHANNELS=window.FREETV_CHANNELS||{};'
                f'window.FREETV_CHANNELS["{key}"]={dumps([js_record(c) for c in chans])};',
            )

    # country index
    countries = []
    for code, chans in merged.items():
        ftv_n = sum(1 for c in chans if c["s"] == SOURCE_FTV)
        countries.append({
            "code": code, "name": country_name(code),
            "flag": f"https://hatscripts.github.io/circle-flags/flags/{code}.svg",
            "total": len(chans), "ftv": ftv_n, "org": len(chans) - ftv_n,
        })
    countries.sort(key=lambda c: c["name"])

    catalog = {
        "generatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "sources": {
            "ftv": {"label": "Free-TV", "count": len(ftv_all),
                    "url": "https://github.com/Free-TV/IPTV"},
            "org": {"label": "iptv-org", "count": len(org_all),
                    "url": "https://github.com/iptv-org/iptv"},
        },
        "stats": {
            "channels": len(ftv_all) + len(org_all),
            "ftv": len(ftv_all), "org": len(org_all),
            "countries": len(countries), "lists": len(ftv_by_key) + len(org_by_code),
        },
        "countries": countries,
        "categories": categories,
        "featured": featured,
        "listUrls": {"ftv": FTV_LIST_URL, "org": ORG_LIST_URL},
    }
    write_js("catalog.js", f"window.FREETV_CATALOG={dumps(catalog)};")

    for code, chans in sorted(merged.items()):
        write_js(
            f"channels-{code}.js",
            'window.FREETV_CHANNELS=window.FREETV_CHANNELS||{};'
            f'window.FREETV_CHANNELS["{code}"]={dumps(chans)};',
        )

    everything = [js_record(c) for c in dedupe(ftv_all + org_all)]
    write_js(
        "channels-all.js",
        'window.FREETV_CHANNELS=window.FREETV_CHANNELS||{};'
        f'window.FREETV_CHANNELS["__all"]={dumps(everything)};',
    )

    summary = (
        f"catalog: {len(ftv_all)} Free-TV + {len(org_all)} iptv-org = "
        f"{len(ftv_all) + len(org_all)} channels, {len(countries)} countries, "
        f"{len(categories)} categories -> {OUT_DIR}"
    )
    if not args.quiet:
        print(summary)


if __name__ == "__main__":
    main()
