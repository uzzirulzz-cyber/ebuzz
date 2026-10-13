import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Search, Sparkles, Sun, Moon, Tv, Globe, Film, Settings } from 'lucide-react';
import ChannelGrid from './components/ChannelGrid';
import Player from './components/Player';
import type { Catalog, CatalogChannel } from './lib/catalog';

const VIEWS = ['Home', 'Pakistan', 'India', 'Sports', 'Global', 'Movies'] as const;
type View = (typeof VIEWS)[number];

export default function App() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [view, setView] = useState<View>('Home');
  const [all, setAll] = useState<CatalogChannel[]>([]);
  const [search, setSearch] = useState<string>('');
  const [active, setActive] = useState<CatalogChannel | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [geminiReady, setGeminiReady] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const c = await (await import('./lib/catalog')).loadCatalog();
        if (!cancelled) setCatalog(c);
      } catch (e) {
        console.error('catalog load failed', e);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const m = await import('./lib/catalog');
        const chans = await m.loadChannels('__all');
        setAll(chans);
      } catch (e) {
        console.error('channels load failed', e);
      }
    })();
  }, [catalog]);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/status');
        const j = await r.json();
        setGeminiReady(j.gemini === 'configured');
      } catch { setGeminiReady(false); }
    })();
  }, []);

  const searched = useMemo(() => {
    const q = search.trim().toLowerCase()
      .normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
    if (!q) return null;
    return all.filter((ch) =>
      (ch.n ?? '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').includes(q));
  }, [all, search]);

  const heroSubtitle: Record<View, string> = {
    Home: 'Surfaced Free-TV curated channels, plus featured live streams across categories.',
    Pakistan: 'Top Pakistani news, drama, and cricket channels (licensed providers only).',
    India: 'Authorized Indian entertainment: news, Bollywood, Hindi / regional-language channels.',
    Sports: 'Cricket / football / F1 / combat sports broadcasts. Distinguish live from upcoming.',
    Global: 'Country / language / genre filters across 200+ countries and official feeds.',
    Movies: 'Licensed movie channels and curated movie streams; do not list pirated sources.',
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-30 flex items-center gap-3 px-6 py-3 bg-[#0a0c10]/95 backdrop-blur border-b border-white/5">
        <a href="#" className="font-extrabold tracking-tight text-lg select-none">
          <span className="text-blue-400">▶</span> PlayBeat <span className="text-blue-400">TV</span>
        </a>
        <nav className="hidden md:flex gap-1 ml-4">
          {VIEWS.map((v) => (
            <button key={v}
                    onClick={() => setView(v)}
                    className={'px-3 py-1.5 rounded-full text-sm transition-colors ' +
                      (view === v ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-white/5')}>
              {v}
            </button>
          ))}
        </nav>
        <div className="flex-1 max-w-xl ml-auto flex items-center gap-2 bg-[#11141c] border border-white/5 rounded-full px-3 py-1.5">
          <Search size={16} className="text-slate-400" />
          <input value={search}
                 onChange={(e) => setSearch(e.target.value)}
                 placeholder="Search 20,000+ channels…"
                 aria-label="Search channels"
                 className="flex-1 bg-transparent outline-none text-sm" />
        </div>
        <button title="Toggle theme" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="p-2 rounded-md text-slate-300 hover:bg-white/5">
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </header>

      <div className="flex-1 grid lg:grid-cols-[260px,minmax(0,1fr)] gap-6 px-6 py-6">
        <aside className="hidden lg:block">
          <h3 className="text-[11px] uppercase tracking-wider text-slate-500 mb-2 px-2">Categories</h3>
          <ul className="space-y-1">
            {VIEWS.map((v) => (
              <li key={v}>
                <button onClick={() => setView(v)}
                        className={'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ' +
                          (view === v ? 'bg-blue-600/15 text-blue-400' : 'text-slate-300 hover:bg-white/5')}>
                  <CategoryIcon v={v} /> {v}
                </button>
              </li>
            ))}
          </ul>
          <h3 className="text-[11px] uppercase tracking-wider text-slate-500 mt-6 mb-2 px-2">Sources</h3>
          <ul className="space-y-1">
            <li><a href="https://github.com/Free-TV/IPTV" target="_blank" rel="noopener noreferrer"
                   className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-white/5">Free-TV/IPTV ↗</a></li>
            <li><a href="https://github.com/iptv-org/iptv" target="_blank" rel="noopener noreferrer"
                   className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-white/5">iptv-org/iptv ↗</a></li>
            <li><a href="https://ai.studio/apps/5d188f2a-5162-4288-a32e-990a76df807a" target="_blank" rel="noopener noreferrer"
                   className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-white/5">AI Studio app ↗</a></li>
          </ul>
          <p className="mt-6 px-2 text-[11px] text-slate-500">
            Chat AI: {geminiReady ? 'enabled' : 'disabled (GEMINI_API_KEY not set)'}
          </p>
        </aside>

        <main className="min-w-0">
          <div className="mb-4">
            <h2 className="text-2xl font-bold tracking-tight">{view}</h2>
            <p className="text-slate-400 text-sm">{heroSubtitle[view]}</p>
          </div>

          {view === 'Home' && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <Hero onPlayRandom={() => {
                if (!all.length) return;
                setActive(all[Math.floor(Math.random() * all.length)]);
              }} />
              <StatsRow catalog={catalog} />
              <ChannelGrid channels={(catalog?.featured ?? []).slice(0, 24)}
                           onSelect={setActive}
                           emptyHint={!catalog ? 'Loading catalog…' : 'No featured channels.'} />
            </motion.div>
          )}

          {view !== 'Home' && (
            searched ? (
              <ChannelGrid channels={searched.slice(0, 600)} onSelect={setActive} />
            ) : (
              <ChannelGrid channels={all.slice(0, 200)} onSelect={setActive}
                           emptyHint={!catalog ? 'Loading channels…' : 'No channels available.'} />
            )
          )}
        </main>
      </div>

      <footer className="border-t border-white/5 px-6 py-4 text-xs text-slate-500">
        PlayBeat TV is a catalog / playback layer over community-maintained playlists. Public streams
        are linked from their original broadcasters; geo-restrictions and availability vary.
        <span className="block mt-1">© {new Date().getFullYear()} · No streams are hosted, proxied, or re-distributed unless the user opts in per stream.</span>
      </footer>

      <Player channel={active} onClose={() => setActive(null)} />
    </div>
  );
}

function Hero({ onPlayRandom }: { onPlayRandom: () => void }) {
  return (
    <motion.section className="rounded-2xl border border-white/5 bg-gradient-to-br from-blue-900/20 via-[#11141c] to-[#11141c] p-6"
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex items-center gap-2 text-blue-300 mb-2"><Sparkles size={16} /> Featured</div>
      <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-2">Free live TV, catalogued.</h1>
      <p className="text-slate-400 max-w-2xl">
        Browse, search and play thousands of publicly listed free channels aggregated from two
        community playlists. Nothing is hosted here; playback uses the original stream URLs.
      </p>
      <div className="flex flex-wrap gap-2 mt-4">
        <button onClick={onPlayRandom}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold">
          ▶ Play a random channel
        </button>
        <a href="#countries" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-white/10 hover:border-blue-500 text-sm text-slate-200">
          Browse countries
        </a>
      </div>
    </motion.section>
  );
}

function StatsRow({ catalog }: { catalog: Catalog | null }) {
  if (!catalog) return null;
  const items: Array<{ v: string; l: string }> = [
    { v: catalog.stats.channels.toLocaleString('en-US'), l: 'channels' },
    { v: String(catalog.stats.countries), l: 'countries' },
    { v: catalog.stats.ftv.toLocaleString('en-US'), l: 'Free-TV curated' },
    { v: catalog.stats.org.toLocaleString('en-US'), l: 'iptv-org indexed' },
    { v: catalog.generatedAt, l: 'updated' },
  ];
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((c, i) => (
        <span key={i} className="inline-flex items-baseline gap-1.5 bg-[#11141c] border border-white/5 rounded-full px-3 py-1.5 text-sm">
          {c.v ? <strong>{c.v}</strong> : null}
          <span className="text-xs text-slate-500">{c.l}</span>
        </span>
      ))}
    </div>
  );
}

function CategoryIcon({ v }: { v: View }) {
  const Icon = v === 'Pakistan' || v === 'India' || v === 'Global' ? Globe
             : v === 'Movies' ? Film
             : v === 'Sports' ? Settings
             : Tv;
  return <Icon size={16} />;
}
