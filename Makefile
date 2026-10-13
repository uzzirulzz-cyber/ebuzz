.PHONY: help playlist catalog bundle check serve ci

help:
	@echo "playlist  - regenerate playlist.m3u8 + playlists/ from lists/ (upstream script, unchanged)"
	@echo "catalog   - rebuild app/data/*.js from lists/ + sources/iptv-org/streams/"
	@echo "bundle    - build the single-file dist/index.html"
	@echo "check     - ruff lint the new tooling (scripts/)"
	@echo "serve     - serve app/ at http://localhost:8000"
	@echo "ci        - everything CI runs"

playlist:
	python3 make_playlist.py

catalog:
	python3 scripts/build_catalog.py

bundle:
	python3 scripts/build_bundle.py

check:
	ruff check scripts/

serve:
	python3 -m http.server 8000 --directory app

ci: check playlist catalog bundle
