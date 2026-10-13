# PlayBeatTV — React app inside `ebuzz`

This folder is the **PlayBeat TV** AI Studio scaffold. It lives next to the
existing free-TV static ebuzz player (`app/`, `docs/`, `scripts/`).

## Run locally

```bash
cd playbeat
npm install
cp .env.example .env      # optional: paste GEMINI_API_KEY to enable chat
npm run dev               # → http://localhost:3001   (Express + Vite middleware)
```

## Build

```bash
cd playbeat
npm run lint              # tsc --noEmit, errors must be zero
npm run build             # → dist/  (uploadable as a Vercel project root)
```

## Deploy to Vercel

Treat `playbeat/` as the Vercel project root (Vercel → New Project → point
the root to `playbeat/`). `playbeat/vercel.json` already pins:

- `framework: null` (Other/static)
- `buildCommand: "npm run build"`
- `outputDirectory: "dist"`
- `/api/*` rewritten to the Express dev server's `/api/*` (in prod, you'll
  also need a serverless rewrite target; the static frontend works against
  it during dev).

## What this app reads

| Path | Served by | Source of truth |
|---|---|---|
| `/src/main.tsx` | Vite | `playbeat/src/` |
| `/api/ping` → `pong` | Express | health check |
| `/api/status` | Express | reports whether `GEMINI_API_KEY` is set |
| `/api/catalog` | Express | reads `../app/data/catalog.js` (Free-TV catalog) |
| `/api/channels/<key>` | Express | reads `../app/data/channels-<key>.js` |
| `/api/proxy?url=<u>` | Express | bridges CORS / mixed-content streams |

To regenerate the catalog data the React app reads, run `make catalog`
from the repo root.

## Notes on the npm versions

- `typescript` pinned to `^5.9.3` (the user's original `^7.0.2` exists on
  npm but `@vitejs/plugin-react` types and many definition packages still
  target the v5.x toolchain — pinning `^5.9.3` keeps `npm run lint`
  green. Bump when v7-derived `@types` packages catch up.

## Files in this folder

```
playbeat/
├── README.md
├── .env.example
├── index.html                      # React entry
├── package.json                    # real stable versions
├── server.ts                       # Express dev server
├── tsconfig.json
├── vite.config.ts                  # ESM-safe (fileURLToPath, not __dirname)
├── vercel.json                     # Other / static preset for Vercel
├── src/
│   ├── App.tsx                     # home / Pakistan / India / Sports / Global / Movies
│   ├── main.tsx
│   ├── index.css                   # Tailwind 4.x theme tokens
│   ├── lib/catalog.ts              # /api/catalog + /api/channels/<key> loader
│   └── components/
│       ├── ChannelGrid.tsx
│       └── Player.tsx              # hls.js player + proxy-toggle button
```
