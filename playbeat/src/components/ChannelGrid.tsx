import { motion } from 'motion/react';
import type { CatalogChannel } from '../lib/catalog';

type Props = {
  channels: CatalogChannel[];
  onSelect: (c: CatalogChannel) => void;
  emptyHint?: string;
};

export default function ChannelGrid({ channels, onSelect, emptyHint }: Props) {
  if (channels.length === 0) {
    return <p className="text-slate-500 text-sm py-12 text-center">{emptyHint || 'No channels.'}</p>;
  }
  return (
    <div className="pbt-card-grid">
      {channels.map((ch, idx) => (
        <Card key={(ch.k ?? ch.c ?? ch.g ?? 'k') + '|' + idx} ch={ch} onSelect={onSelect} />
      ))}
    </div>
  );
}

function Card({ ch, onSelect }: { ch: CatalogChannel; onSelect: (c: CatalogChannel) => void }) {
  const initials = (ch.n || 'TV').split(/\s+/).slice(0, 2).map((w) => w[0] || '*').join('').toUpperCase();
  let h = 0;
  for (let i = 0; i < ch.n.length; i++) h = (h * 31 + ch.n.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  const badgeColor = ch.s === 'ftv'
    ? 'bg-[#ff9f43]/20 text-[#ff9f43]'
    : 'bg-[#4fc3f7]/20 text-[#4fc3f7]';
  return (
    <motion.button
      type="button"
      onClick={() => onSelect(ch)}
      whileHover={{ y: -2 }}
      className="group text-left flex items-center gap-3 bg-[#11141c] hover:bg-[#161b25] border border-white/5 hover:border-blue-500/60 rounded-2xl p-3 transition-colors"
    >
      <div className="w-11 h-11 rounded-lg overflow-hidden bg-white flex items-center justify-center shrink-0"
           style={{ background: 'hsl(' + hue + ' 45% 32%)' }}>
        {ch.l ? (
          <img src={ch.l} alt="" className="w-full h-full object-contain p-1"
               onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
        ) : (
          <span className="text-white/90 font-bold tracking-wide text-sm">{initials}</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold truncate text-sm">{ch.n}</p>
        <p className="text-xs text-slate-500 truncate">
          {[ch.g, ch.q].filter(Boolean).join(' · ') || 'Live'}
        </p>
      </div>
      <span className={'text-[10px] tracking-wider font-bold uppercase rounded px-1.5 py-0.5 ' + badgeColor}>
        {ch.s === 'ftv' ? 'FTV' : 'ORG'}
      </span>
    </motion.button>
  );
}
