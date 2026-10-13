// PlayBeatTV Express dev server. Serves the Vite app, serves the catalog
// data files read from the parent ebuzz static site, and provides /api/proxy
// for streams the browser cannot reach directly (http:// on an https page
// and origins without permissive CORS).

import express, { type Request, type Response, type NextFunction } from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer as createViteServer } from 'vite';
import { config as loadDotenv } from 'dotenv';

loadDotenv();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT) || 3001;
const isProd = process.env.NODE_ENV === 'production';
const ROOT = __dirname;
const DATA_DIR = path.join(__dirname, '..', 'app', 'data');

// ---------------- stream proxy ----------------
const UA =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/126.0 Safari/537.36';
const MAX_BYTES = 64 * 1024 * 1024;
const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': '*',
  'Cache-Control': 'no-store',
};

function setCORS(res: Response) {
  for (const [k, v] of Object.entries(CORS)) res.setHeader(k, v);
}

function isPrivateHost(host: string) {
  const h = host.toLowerCase();
  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local') || h.endsWith('.internal')) return true;
  if (/^(127\.|10\.|192\.168\.|169\.254\.|0\.|::1$|fe80:)/.test(h)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return true;
  return false;
}

function proxify(uri: string, base: URL): string {
  try {
    const abs = new URL(uri, base);
    if (!['https:', 'http:'].includes(abs.protocol)) return uri;
    return '/api/proxy?url=' + encodeURIComponent(abs.toString());
  } catch {
    return uri;
  }
}

function rewritePlaylist(text: string, base: URL): string {
  return text.split('\n').map((line) => {
    const t = line.trim();
    if (!t) return line;
    if (t.startsWith('#')) {
      return line.replace(/URI="([^"]+)"/g, (_, uri: string) =>
        'URI="' + proxify(uri, base) + '"');
    }
    return proxify(t, base);
  }).join('\n');
}

function isPlaylistUrl(url: string): boolean {
  return /\.m3u8(\?|$)/i.test(url);
}

async function createServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  // ---- /api/ping ----
  app.get('/api/ping', (_req, res) => {
    setCORS(res);
    res.type('text/plain').send('pong');
  });

  // ---- /api/proxy ----
  app.get('/api/proxy', async (req: Request, res: Response) => {
    setCORS(res);
    const target = (req.query.url as string | undefined);
    if (!target) {
      res.status(400).send('usage: /api/proxy?url=<encoded stream URL>  (add &ping=1 to test)');
      return;
    }
    let u: URL;
    try { u = new URL(target); }
    catch { res.status(400).send('invalid url'); return; }

    if (!['https:', 'http:'].includes(u.protocol)) {
      res.status(400).send('only http/https targets');
      return;
    }
    if (isPrivateHost(u.hostname)) {
      res.status(403).send('private hosts are not proxied');
      return;
    }

    try {
      const upstream = await fetch(u, {
        headers: {
          'User-Agent': UA,
          Accept: '*/*',
          Referer: u.origin + '/',
        },
        redirect: 'follow',
      });
      const ct = upstream.headers.get('content-type') || '';
      if (isPlaylistUrl(u.pathname + u.search) || /mpegurl/i.test(ct)) {
        const text = await upstream.text();
        res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
        res.send(rewritePlaylist(text, u));
        return;
      }
      res.setHeader('Content-Type', ct || 'application/octet-stream');
      if (!upstream.body) { res.end(); return; }
      const reader = upstream.body.getReader();
      let sent = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        sent += value.length;
        if (sent > MAX_BYTES) { reader.cancel().catch(() => {}); break; }
        res.write(Buffer.from(value));
      }
      res.end();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'unknown';
      res.status(502).send('upstream error: ' + msg);
    }
  });

  // ---- /api/catalog ----
  app.get('/api/catalog', async (_req, res) => {
    setCORS(res);
    try {
      const text = await fs.readFile(path.join(DATA_DIR, 'catalog.js'), 'utf8');
      res.type('text/javascript').send(text);
    } catch {
      res.status(500).type('application/json').send({
        error: 'catalog missing — run scripts/build_catalog.py (commands: "make catalog")',
      });
    }
  });

  // ---- /api/channels/<key> ----
  app.get('/api/channels/:key', async (req, res) => {
    setCORS(res);
    const safe = String(req.params.key).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
    if (!safe) { res.status(400).type('application/json').send({ error: 'invalid key' }); return; }
    try {
      const text = await fs.readFile(path.join(DATA_DIR, 'channels-' + safe + '.js'), 'utf8');
      res.type('text/javascript').send(text);
    } catch {
      res.status(404).type('application/json').send({ error: 'not found', key: safe });
    }
  });

  // ---- /api/status ----
  app.get('/api/status', (_req, res) => {
    setCORS(res);
    res.type('application/json').send({
      service: 'playbeat-tv',
      ok: true,
      timestamp: new Date().toISOString(),
      gemini: process.env.GEMINI_API_KEY ? 'configured' : 'not configured',
      streamProxyLimit: MAX_BYTES,
    });
  });

  // ---- static / vite ----
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
      root: ROOT,
    });
    app.use(vite.middlewares);
  } else {
    const dist = path.join(ROOT, 'dist');
    app.use(express.static(dist));
    app.get('*', async (_req, res) => {
      try {
        const html = await fs.readFile(path.join(dist, 'index.html'), 'utf8');
        res.type('text/html').send(html);
      } catch {
        res.status(200).send('Build output missing - run "npm run build" inside playbeat/.');
      }
    });
  }

  // Generic error handler.
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[server]', err);
    res.status(500).type('text/plain').send('internal error');
  });

  app.listen(PORT, () => {
    console.log('PlayBeatTV dev server  http://localhost:' + PORT);
    console.log('  /api/ping    http://localhost:' + PORT + '/api/ping');
    console.log('  /api/catalog http://localhost:' + PORT + '/api/catalog');
    console.log('  /api/proxy   http://localhost:' + PORT + '/api/proxy?url=<enc>');
    console.log('  gemini      ' + (process.env.GEMINI_API_KEY ? 'GEMINI_API_KEY set' : 'no GEMINI_API_KEY (chat disabled)'));
  });
}

createServer().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
