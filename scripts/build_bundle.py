#!/usr/bin/env python3
"""Inline the whole app into a single deployable ``dist/index.html``.

The multi-file app under ``app/`` is the canonical source (GitHub Pages serves
it as-is). This script produces the same app as ONE self-contained HTML file:
stylesheet, hls.js, the app code and every generated data module are inlined,
so ``dist/index.html`` works offline, from ``file://``, or as a single artifact.

Usage:
    python3 scripts/build_bundle.py
"""

from __future__ import annotations

import glob
import os
import sys

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
APP_DIR = os.path.join(BASE_DIR, "app")
DIST_DIR = os.path.join(BASE_DIR, "dist")

MARKERS = {
    "css": '<link rel="stylesheet" href="assets/css/style.css" />',
    "hls": '<script src="assets/js/vendor/hls.min.js" defer></script>',
    "app": '<script src="assets/js/app.js" defer></script>',
}


def read(path: str) -> str:
    with open(path, encoding="utf-8") as handle:
        return handle.read()


def main() -> None:
    html = read(os.path.join(APP_DIR, "index.html"))

    css = read(os.path.join(APP_DIR, "assets", "css", "style.css"))
    hls = read(os.path.join(APP_DIR, "assets", "js", "vendor", "hls.min.js"))
    app_js = read(os.path.join(APP_DIR, "assets", "js", "app.js"))

    data_files = sorted(glob.glob(os.path.join(APP_DIR, "data", "*.js")))
    if not data_files:
        sys.exit("no data modules found — run scripts/build_catalog.py first")
    data = "\n".join(read(path) for path in data_files)

    replacements = {
        MARKERS["css"]: "<style>\n" + css + "\n</style>",
        MARKERS["hls"]: "<script>\n" + hls + "\n</script>",
        MARKERS["app"]: "<script>\n/* generated catalog data */\n" + data
                        + "\n</script>\n<script>\n" + app_js + "\n</script>",
    }
    for marker, replacement in replacements.items():
        if marker not in html:
            sys.exit("marker missing from app/index.html: " + marker)
        html = html.replace(marker, replacement)

    os.makedirs(DIST_DIR, exist_ok=True)
    out_path = os.path.join(DIST_DIR, "index.html")
    with open(out_path, "w", encoding="utf-8") as handle:
        handle.write(html)

    size_mb = os.path.getsize(out_path) / 1e6
    print(f"bundle: {out_path} ({size_mb:.1f} MB, {len(data_files)} data modules inlined)")


if __name__ == "__main__":
    main()
