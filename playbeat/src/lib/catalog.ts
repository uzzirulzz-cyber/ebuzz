// Catalog loader. Reads the same `app/data/*.js` modules the ebuzz static site
// builds, via /api/catalog and /api/channels/<key> from server.ts.

export type CatalogChannel = {
  n: string;          // display name
  u?: string;         // stream URL
  l?: string;         // logo URL
  c?: string;         // country code (lower-case)
  g?: string;         // group/title
  id?: string;        // EPG id
  q?: string;         // quality suffix like "720p"
  r?: string;         // raw display name with markers
  s?: 'ftv' | 'org';  // source
  k?: string;         // list key
  t?: string[];       // tag markers
  y?: boolean;        // youtube flag
  ch?: string;
  sec?: string;
};

export type Catalog = {
  generatedAt: string;
  sources: {
    ftv: { label: string; count: number; url: string };
    org: { label: string; count: number; url: string };
  };
  stats: { channels: number; ftv: number; org: number; countries: number; lists: number };
  countries: Array<{ code: string; name: string; flag: string; total: number; ftv: number; org: number }>;
  categories: Array<{ key: string; label: string; count: number }>;
  featured: CatalogChannel[];
  listUrls: { ftv: string; org: string };
};

declare global {
  interface Window {
    FREETV_CATALOG?: Catalog;
    FREETV_CHANNELS?: Record<string, CatalogChannel[]>;
  }
}

type PromiseMap<T> = { [k: string]: Promise<T> | undefined };
const inflight: { catalog?: Promise<Catalog>; channels: PromiseMap<CatalogChannel[]> } = { channels: {} };

export async function loadCatalog(): Promise<Catalog> {
  if (window.FREETV_CATALOG) return window.FREETV_CATALOG;
  if (inflight.catalog) return inflight.catalog;
  inflight.catalog = (async () => {
    await loadScript('/api/catalog');
    if (!window.FREETV_CATALOG) throw new Error('FREETV_CATALOG not present after /api/catalog');
    return window.FREETV_CATALOG;
  })();
  return inflight.catalog;
}

export async function loadChannels(key: string): Promise<CatalogChannel[]> {
  if (window.FREETV_CHANNELS?.[key]) return window.FREETV_CHANNELS[key];
  if (inflight.channels[key]) return inflight.channels[key];
  const file = key === '__all' ? '/api/channels/__all' : '/api/channels/' + key;
  inflight.channels[key] = (async () => {
    await loadScript(file);
    return window.FREETV_CHANNELS?.[key] ?? [];
  })();
  return inflight.channels[key];
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if ([...document.scripts].some((s) => s.src.endsWith(src))) return resolve();
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('failed to load ' + src));
    document.head.appendChild(s);
  });
}
