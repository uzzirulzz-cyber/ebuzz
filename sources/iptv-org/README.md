# Vendored: iptv-org/iptv — `streams/`

Snapshot of <https://github.com/iptv-org/iptv/tree/master/streams> taken **2026-10-13**:
326 M3U files, 17,968 `#EXTINF` entries, 202 territory codes (including 124 provider files
such as `us_pluto.m3u`, `de_samsung.m3u`, `ca_stingray.m3u`).

Upstream license: **The Unlicense** (public domain).

These files are read by `scripts/build_catalog.py` and are not modified. Refresh with:

```bash
git clone --depth 1 https://github.com/iptv-org/iptv /tmp/iptv-org
cp /tmp/iptv-org/streams/*.m3u sources/iptv-org/streams/
python3 scripts/build_catalog.py
```
