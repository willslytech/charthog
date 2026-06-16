'use client';

import { useState, useEffect } from 'react';
import { Settings, X } from 'lucide-react';
import { cn } from '@/lib/utils';

// ===== TYPES =====
type Tab = 'market' | 'beat' | 'stocks' | 'etf' | 'crypto';

interface Article {
  id: number;
  datetime: number;
  headline: string;
  summary?: string;
  source: string;
  url: string;
  _sym?: string;
}

// ===== CONSTANTS =====
const BLOG_SOURCES = new Set([
  'Seeking Alpha', 'Motley Fool', 'Benzinga', 'InvestorPlace',
  'Zacks', 'TheStreet', 'The Street', 'Investopedia', 'MarketBeat',
  'Stock Analysis', 'GuruFocus', 'Simply Wall St', 'TipRanks',
]);

const ALL_SOURCES = [
  'Reuters', 'Associated Press', 'Bloomberg', 'CNBC', 'MarketWatch',
  'Yahoo Finance', 'Wall Street Journal', 'Financial Times', 'Fortune',
  'Forbes', 'Business Insider', 'Nasdaq', 'PR Newswire', 'Globe Newswire',
  'Seeking Alpha', 'Motley Fool', 'Benzinga', 'InvestorPlace',
  'Zacks', 'TheStreet', 'Investopedia', 'MarketBeat',
];

const STOCK_CHIPS = [
  'NVDA','AAPL','MSFT','AMZN','META','TSLA','GOOGL','JPM','AMD','NFLX',
  'CRM','AVGO','LLY','V','MA','XOM','CVX','UNH','JNJ','PG','HD','WMT',
  'BAC','COST','GS','INTC','ORCL','ADBE','PYPL','DIS','SBUX','MCD','NKE',
  'T','VZ','CSCO','IBM','MU','QCOM','TXN','AMAT','BABA','SHOP','SQ','COIN',
];

const ETF_CHIPS = [
  'SPY','QQQ','IWM','GLD','TLT','XLK','XLE','XLF','XLV','ARKK',
  'VTI','VOO','IVV','VEA','EEM','AGG','HYG','GDX','SPYG','SPXU',
  'SQQQ','TQQQ','IAU','SLV','USO','XLP','XLY','XLI','XLU','XLB',
];

const CRYPTO_CHIPS = [
  'BTC','ETH','SOL','XRP','ADA','DOGE','BNB','AVAX','DOT','MATIC',
  'LINK','UNI','ATOM','LTC','NEAR','FTM','ALGO','XLM','ICP','HBAR',
];

const CHIP_POOL: Record<Tab, string[]> = {
  market: STOCK_CHIPS,
  beat:   STOCK_CHIPS,
  stocks: STOCK_CHIPS,
  etf:    ETF_CHIPS,
  crypto: CRYPTO_CHIPS,
};

const CAT_MAP: Record<Tab, string> = {
  market: 'general',
  beat:   'beat',
  stocks: 'stocks',
  etf:    'etf',
  crypto: 'crypto',
};

// ===== HELPERS =====
function extractChips(text: string, pool: string[], sym?: string): string[] {
  const found: string[] = sym ? [sym] : [];
  // Parenthesized tickers: (NVDA)
  const paren = text.match(/\(([A-Z]{2,6})\)/g) ?? [];
  for (const m of paren) {
    const t = m.replace(/[()]/g, '');
    if (pool.includes(t) && !found.includes(t)) found.push(t);
    if (found.length >= 4) break;
  }
  // Bare uppercase for crypto / ETF pools
  if (found.length < 3) {
    const upper = ' ' + text.toUpperCase() + ' ';
    for (const t of pool) {
      const boundary = new RegExp(`[^A-Z]${t}[^A-Z]`);
      if (boundary.test(upper) && !found.includes(t)) {
        found.push(t);
        if (found.length >= 4) break;
      }
    }
  }
  return found.slice(0, 5);
}

function chipIsUp(ticker: string, id: number): boolean {
  return (ticker.charCodeAt(0) * 7 + id) % 3 !== 2;
}

function fmtTime(unix: number): string {
  const diff = Math.floor(Date.now() / 1000 - unix);
  if (diff < 60)    return `${diff}s ago`;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(unix * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const SRC_COLORS = [
  'bg-blue-700','bg-emerald-700','bg-violet-700','bg-orange-700',
  'bg-rose-700','bg-teal-700','bg-amber-700','bg-sky-700',
  'bg-pink-700','bg-indigo-700','bg-cyan-700','bg-lime-700',
];
function srcColor(s: string) {
  return SRC_COLORS[s.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % SRC_COLORS.length];
}

// ===== ROW COMPONENTS =====
function CompactRow({ a }: { a: Article }) {
  return (
    <div className="flex gap-2 py-1.5 border-b border-border/25 hover:bg-muted/20 group transition-colors">
      <div className={cn(
        'w-4 h-4 rounded-sm shrink-0 mt-0.5 flex items-center justify-center text-[8px] font-bold text-white',
        srcColor(a.source)
      )}>
        {a.source[0]}
      </div>
      <div className="min-w-0">
        <a
          href={a.url} target="_blank" rel="noopener noreferrer"
          className="text-[11px] leading-tight text-sky-400 hover:text-sky-300 hover:underline line-clamp-2"
        >
          {a.headline}
        </a>
        <p className="text-[10px] text-muted-foreground mt-0.5" suppressHydrationWarning>
          {a.source} · {fmtTime(a.datetime)}
        </p>
      </div>
    </div>
  );
}

function TaggedRow({ a, pool }: { a: Article; pool: string[] }) {
  const chips = extractChips((a.headline ?? '') + ' ' + (a.summary ?? ''), pool, a._sym);
  return (
    <div className="flex gap-3 px-4 py-2.5 border-b border-border/25 hover:bg-muted/20 transition-colors">
      <div className="text-[10px] text-muted-foreground shrink-0 w-16 text-right pt-0.5 leading-tight" suppressHydrationWarning>
        {fmtTime(a.datetime)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1 mb-1.5">
          {chips.map(t => (
            <span
              key={t}
              className={cn(
                'text-[9px] font-bold px-1.5 py-0.5 rounded-sm text-white leading-none',
                chipIsUp(t, a.id) ? 'bg-green-600' : 'bg-red-600'
              )}
            >
              {t}
            </span>
          ))}
          <span className={cn('text-[9px] px-1.5 py-0.5 rounded-sm text-white leading-none opacity-75', srcColor(a.source))}>
            {a.source}
          </span>
        </div>
        <a
          href={a.url} target="_blank" rel="noopener noreferrer"
          className="text-xs text-foreground hover:text-sky-400 hover:underline leading-snug"
        >
          {a.headline}
        </a>
      </div>
    </div>
  );
}

// ===== TWO-COLUMN LAYOUT =====
function TwoColumnView({
  articles, hidden, leftLabel, rightLabel,
}: {
  articles: Article[]; hidden: Set<string>; leftLabel: string; rightLabel: string;
}) {
  const visible  = articles.filter(a => !hidden.has(a.source));
  const newsItems = visible.filter(a => !BLOG_SOURCES.has(a.source));
  const blogItems = visible.filter(a =>  BLOG_SOURCES.has(a.source));

  const half       = Math.ceil(newsItems.length / 2);
  const leftItems  = blogItems.length > 0 ? newsItems            : newsItems.slice(0, half);
  const rightItems = blogItems.length > 0 ? blogItems            : newsItems.slice(half);

  return (
    <div className="grid grid-cols-2 divide-x divide-border">
      <div className="p-4">
        <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3 pb-2 border-b border-border">
          {leftLabel}
        </h2>
        {leftItems.map(a => <CompactRow key={a.id} a={a} />)}
      </div>
      <div className="p-4">
        <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3 pb-2 border-b border-border">
          {rightLabel}
        </h2>
        {rightItems.map(a => <CompactRow key={a.id} a={a} />)}
      </div>
    </div>
  );
}

// ===== SETTINGS PANEL =====
function SettingsPanel({
  open, onClose, hidden, onToggle,
}: {
  open: boolean; onClose: () => void; hidden: Set<string>; onToggle: (s: string) => void;
}) {
  return (
    <>
      {open && <div className="fixed inset-0 z-40" onClick={onClose} />}
      <aside className={cn(
        'fixed right-0 top-[64px] h-[calc(100vh-64px)] w-60 bg-card border-l border-border shadow-2xl z-50',
        'transition-transform duration-200 ease-in-out overflow-y-auto',
        open ? 'translate-x-0' : 'translate-x-full',
      )}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border sticky top-0 bg-card z-10">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Filter Sources
          </span>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="py-1">
          {ALL_SOURCES.map(src => (
            <label
              key={src}
              className="flex items-center gap-2.5 px-4 py-2 hover:bg-muted cursor-pointer border-b border-border/20 transition-colors"
            >
              <input
                type="checkbox"
                checked={!hidden.has(src)}
                onChange={() => onToggle(src)}
                className="w-3.5 h-3.5 accent-sky-500 shrink-0"
              />
              <div className={cn(
                'w-3.5 h-3.5 rounded-sm flex items-center justify-center text-[8px] font-bold text-white shrink-0',
                srcColor(src)
              )}>
                {src[0]}
              </div>
              <span className="text-xs text-foreground truncate">{src}</span>
            </label>
          ))}
        </div>
      </aside>
    </>
  );
}

// ===== SKELETON =====
function Skeleton() {
  return (
    <div className="grid grid-cols-2 divide-x divide-border animate-pulse">
      {[0, 1].map(col => (
        <div key={col} className="p-4 space-y-3">
          <div className="h-3 w-16 bg-muted rounded mb-4" />
          {Array.from({ length: 18 }).map((_, i) => (
            <div key={i} className="flex gap-2">
              <div className="w-4 h-4 bg-muted rounded-sm shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-2.5 bg-muted rounded w-full" />
                <div className="h-2.5 bg-muted rounded w-4/5" />
                <div className="h-2 bg-muted/50 rounded w-1/4" />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ===== MAIN PAGE =====
const TABS: { key: Tab; label: string }[] = [
  { key: 'market', label: 'Market News' },
  { key: 'beat',   label: 'Market Beat' },
  { key: 'stocks', label: 'Stocks News' },
  { key: 'etf',    label: 'ETF News'    },
  { key: 'crypto', label: 'Crypto News' },
];

export default function NewsPage() {
  const [tab,        setTab]        = useState<Tab>('market');
  const [articles,   setArticles]   = useState<Article[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [panelOpen,  setPanelOpen]  = useState(false);
  const [hidden,     setHidden]     = useState<Set<string>>(new Set());

  useEffect(() => {
    setLoading(true);
    setArticles([]);
    fetch(`/api/news-feed?cat=${CAT_MAP[tab]}`)
      .then(r => r.json())
      .then((d: unknown) => {
        setArticles(Array.isArray(d) ? (d as Article[]) : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [tab]);

  const toggle = (src: string) =>
    setHidden(prev => {
      const n = new Set(prev);
      n.has(src) ? n.delete(src) : n.add(src);
      return n;
    });

  const visible = articles.filter(a => !hidden.has(a.source));

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky tab bar */}
      <div className="sticky top-16 z-30 flex items-center justify-between px-4 pt-3 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="flex items-center">
          {TABS.map((t, i) => (
            <span key={t.key} className="flex items-center">
              {i > 0 && <span className="text-border/50 mx-3 select-none text-sm">|</span>}
              <button
                onClick={() => setTab(t.key)}
                className={cn(
                  'pb-2.5 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap',
                  tab === t.key
                    ? 'text-sky-400 border-sky-400'
                    : 'text-muted-foreground border-transparent hover:text-foreground',
                )}
              >
                {t.label}
              </button>
            </span>
          ))}
        </div>

        {/* Gear icon */}
        <button
          onClick={() => setPanelOpen(o => !o)}
          title="Filter news sources"
          className={cn(
            'mb-2 p-1.5 rounded border transition-colors shrink-0',
            panelOpen
              ? 'border-sky-500 text-sky-400 bg-sky-500/10'
              : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted',
          )}
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <Skeleton />
      ) : articles.length === 0 ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
          No articles available.
        </div>
      ) : tab === 'market' ? (
        <TwoColumnView articles={articles} hidden={hidden} leftLabel="News" rightLabel="Blogs" />
      ) : tab === 'beat' ? (
        <TwoColumnView articles={articles} hidden={hidden} leftLabel="Market Beat" rightLabel="M&A News" />
      ) : (
        <div className="max-w-5xl">
          {visible.map(a => <TaggedRow key={a.id} a={a} pool={CHIP_POOL[tab]} />)}
        </div>
      )}

      {/* Settings panel */}
      <SettingsPanel open={panelOpen} onClose={() => setPanelOpen(false)} hidden={hidden} onToggle={toggle} />
    </div>
  );
}
