'use client';

import { useState, useEffect, useRef } from 'react';
import { RefreshCw, Plus, X, ExternalLink, BookMarked, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StockQuote } from '@/lib/types';
import { type SavedWatchlist, getWatchlists } from '@/lib/watchlistStore';
import { getFinnhubWS } from '@/lib/finnhubWS';

// ── Types ─────────────────────────────────────────────────────────────────────
type Tab = 'watchlist' | 'details' | 'news';

interface WatchQuote { price: number; pct: number }
interface NewsItem   { headline: string; source: string; datetime: number; url: string }
interface Profile {
  name: string; exchange: string; finnhubIndustry: string;
  marketCapitalization: number; ipo: string; country: string;
  currency: string; logo: string; weburl: string; shareOutstanding: number;
}

const DEFAULT_WATCHLIST = ['AAPL', 'TSLA', 'NVDA', 'MSFT', 'AMZN', 'META', 'SPY', 'QQQ', 'GS', 'JPM'];

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtP = (n: number) =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const timeAgo = (ts: number) => {
  const s = Math.floor(Date.now() / 1000 - ts);
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

const fmtMktCap = (n: number) => {
  if (n >= 1000) return `$${(n / 1000).toFixed(2)}T`;
  return `$${n.toFixed(1)}B`;
};

// ── Sub-components ────────────────────────────────────────────────────────────
function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex-1 py-2.5 text-[11px] font-mono font-semibold tracking-wide uppercase transition-colors',
        active
          ? 'text-sky-500 border-b-2 border-sky-500 -mb-px'
          : 'text-muted-foreground hover:text-foreground'
      )}
    >
      {children}
    </button>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
      <span className="text-[11px] text-muted-foreground font-mono">{label}</span>
      <span className="text-[11px] text-foreground font-mono font-medium text-right max-w-[55%] truncate">{value}</span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function RightPanel({
  symbol,
  quote,
  onSelectSymbol,
}: {
  symbol: string;
  quote: StockQuote | null;
  onSelectSymbol: (sym: string, name: string) => void;
}) {
  const [tab, setTab]               = useState<Tab>('watchlist');
  const [watchlist, setWatchlist]   = useState<string[]>([]);
  const [watchQuotes, setWatchQuotes] = useState<Record<string, WatchQuote>>({});
  const [quotesLoading, setQuotesLoading] = useState(false);
  const [isLive, setIsLive]         = useState(false);
  const [addInput, setAddInput]     = useState('');
  const [savedWatchlists, setSavedWatchlists] = useState<SavedWatchlist[]>([]);
  const [loadMenuOpen, setLoadMenuOpen] = useState(false);
  const [news, setNews]             = useState<NewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [profile, setProfile]       = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const cancelRef = useRef(false);
  const prevClosesRef = useRef<Record<string, number>>({});

  // ── Watchlist — persist to localStorage ──────────────────────────────────
  useEffect(() => {
    const stored = localStorage.getItem('charthog_watchlist');
    setWatchlist(stored ? JSON.parse(stored) : DEFAULT_WATCHLIST);
    setSavedWatchlists(getWatchlists());
  }, []);

  useEffect(() => {
    if (watchlist.length) localStorage.setItem('charthog_watchlist', JSON.stringify(watchlist));
  }, [watchlist]);

  // ── Fetch initial quotes for prevClose + baseline prices ─────────────────
  const refreshQuotes = async (list: string[]) => {
    cancelRef.current = false;
    setQuotesLoading(true);
    for (const sym of list) {
      if (cancelRef.current) break;
      try {
        const res = await fetch(`/api/quote?symbol=${sym}`);
        if (res.ok) {
          const q = await res.json();
          if (!q.error) {
            prevClosesRef.current[sym] = q.pc;
            setWatchQuotes(prev => ({ ...prev, [sym]: { price: q.c, pct: q.dp } }));
          }
        }
      } catch { /* ignore individual failures */ }
      await new Promise(r => setTimeout(r, 120));
    }
    setQuotesLoading(false);
  };

  useEffect(() => {
    if (!watchlist.length) return;
    refreshQuotes(watchlist);
    return () => { cancelRef.current = true; };
  }, [watchlist]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── WebSocket real-time price updates ────────────────────────────────────
  useEffect(() => {
    const ws = getFinnhubWS();
    if (!ws || !watchlist.length) return;

    const unsubs = watchlist.map(sym =>
      ws.subscribe(sym, (symbol, price) => {
        const pc = prevClosesRef.current[symbol];
        if (pc === undefined) return;
        const pct = ((price - pc) / pc) * 100;
        setIsLive(true);
        setWatchQuotes(prev => ({ ...prev, [symbol]: { price, pct } }));
      })
    );

    return () => { unsubs.forEach(fn => fn()); };
  }, [watchlist]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fetch news ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (tab !== 'news') return;
    setNewsLoading(true);
    setNews([]);
    fetch(`/api/news?symbol=${symbol}`)
      .then(r => r.json())
      .then(d => setNews(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setNewsLoading(false));
  }, [tab, symbol]);

  // ── Fetch profile ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (tab !== 'details') return;
    setProfileLoading(true);
    setProfile(null);
    fetch(`/api/profile?symbol=${symbol}`)
      .then(r => r.json())
      .then(d => setProfile(d?.name ? d : null))
      .catch(() => {})
      .finally(() => setProfileLoading(false));
  }, [tab, symbol]);

  // ── Watchlist actions ─────────────────────────────────────────────────────
  const addSymbol = () => {
    const sym = addInput.trim().toUpperCase().replace(/[^A-Z0-9.\-]/g, '');
    if (!sym || watchlist.includes(sym)) { setAddInput(''); return; }
    setWatchlist(prev => [sym, ...prev]);
    setAddInput('');
  };

  const removeSymbol = (sym: string) => {
    setWatchlist(prev => prev.filter(s => s !== sym));
    setWatchQuotes(prev => { const n = { ...prev }; delete n[sym]; return n; });
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full flex-col bg-background">

      {/* ── Tabs ── */}
      <div className="flex shrink-0 border-b border-border">
        <TabBtn active={tab === 'watchlist'} onClick={() => setTab('watchlist')}>Watch</TabBtn>
        <TabBtn active={tab === 'details'}   onClick={() => setTab('details')}>Details</TabBtn>
        <TabBtn active={tab === 'news'}      onClick={() => setTab('news')}>News</TabBtn>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto">

        {/* ════════════ WATCHLIST ════════════ */}
        {tab === 'watchlist' && (
          <div className="flex flex-col">
            {/* Add + refresh row */}
            <div className="flex gap-2 border-b border-border/50 p-2.5">
              <input
                value={addInput}
                onChange={e => setAddInput(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === 'Enter' && addSymbol()}
                placeholder="Add ticker…"
                maxLength={10}
                className="min-w-0 flex-1 rounded-lg border border-border bg-muted px-2.5 py-1.5 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:border-sky-500/60 focus:outline-none"
              />
              <button
                onClick={addSymbol}
                title="Add"
                className="rounded-lg border border-border bg-muted px-2 py-1.5 text-muted-foreground hover:border-sky-500/50 hover:text-sky-500 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => refreshQuotes(watchlist)}
                disabled={quotesLoading}
                title={isLive ? 'Live via WebSocket' : 'Refresh prices'}
                className="relative rounded-lg border border-border bg-muted px-2 py-1.5 text-muted-foreground hover:border-border/80 hover:text-foreground transition-colors disabled:opacity-40"
              >
                <RefreshCw className={cn('h-3.5 w-3.5', quotesLoading && 'animate-spin')} />
                {isLive && (
                  <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                )}
              </button>
            </div>

            {/* Load saved watchlist row */}
            {savedWatchlists.length > 0 && (
              <div className="relative border-b border-border/50 px-2.5 py-1.5">
                <button
                  onClick={() => setLoadMenuOpen(v => !v)}
                  className="flex w-full items-center gap-1.5 rounded px-1.5 py-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  <BookMarked className="w-3 h-3" />
                  Load saved watchlist
                  <ChevronDown className={cn('w-3 h-3 ml-auto transition-transform', loadMenuOpen && 'rotate-180')} />
                </button>
                {loadMenuOpen && (
                  <div className="absolute left-0 right-0 z-20 mx-2 mt-0.5 rounded-lg border border-border bg-popover shadow-xl overflow-hidden">
                    {savedWatchlists.map(wl => (
                      <button
                        key={wl.id}
                        onClick={() => {
                          setWatchlist(wl.symbols);
                          setLoadMenuOpen(false);
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-muted transition-colors"
                      >
                        <span className="text-[11px] text-foreground font-medium truncate">{wl.name}</span>
                        <span className="text-[10px] text-muted-foreground font-mono ml-2 shrink-0">{wl.symbols.length}s</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* List */}
            {watchlist.map(sym => {
              const q   = watchQuotes[sym];
              const up  = q ? q.pct >= 0 : true;
              const active = sym === symbol;
              return (
                <button
                  key={sym}
                  onClick={() => onSelectSymbol(sym, sym)}
                  className={cn(
                    'group flex w-full items-center justify-between border-b border-border/30 px-3.5 py-2.5 transition-colors hover:bg-muted/40',
                    active && 'border-l-2 border-l-sky-500 bg-sky-500/5 pl-3'
                  )}
                >
                  <span className={cn('font-mono text-sm font-bold', active ? 'text-sky-500' : 'text-foreground')}>
                    {sym}
                  </span>
                  <div className="flex items-center gap-2">
                    {q ? (
                      <>
                        <span className="font-mono text-xs text-foreground">${fmtP(q.price)}</span>
                        <span className={cn('w-[54px] text-right font-mono text-xs font-semibold', up ? 'text-green-400' : 'text-red-400')}>
                          {up ? '+' : ''}{q.pct.toFixed(2)}%
                        </span>
                      </>
                    ) : (
                      <span className="font-mono text-xs text-muted-foreground/40">—</span>
                    )}
                    <button
                      onClick={e => { e.stopPropagation(); removeSymbol(sym); }}
                      className="ml-0.5 opacity-0 transition-opacity group-hover:opacity-100 text-slate-600 hover:text-red-400"
                      title="Remove"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                </button>
              );
            })}

            {watchlist.length === 0 && (
              <p className="py-10 text-center font-mono text-xs text-slate-600">
                No symbols — add one above
              </p>
            )}
          </div>
        )}

        {/* ════════════ DETAILS ════════════ */}
        {tab === 'details' && (
          <div className="p-4">
            {profileLoading && (
              <div className="space-y-2">
                {Array.from({ length: 7 }).map((_, i) => (
                  <div key={i} className="h-7 animate-pulse rounded-lg bg-muted/60" />
                ))}
              </div>
            )}

            {!profileLoading && profile && (
              <div className="space-y-5">
                {/* Company header */}
                <div className="flex items-center gap-3">
                  {profile.logo && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={profile.logo}
                      alt={profile.name}
                      className="h-10 w-10 rounded-lg bg-white object-contain p-1"
                    />
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-foreground">{profile.name}</p>
                    <p className="font-mono text-[11px] text-muted-foreground">
                      {symbol} · {profile.exchange?.split(' ')[0] ?? '—'}
                    </p>
                  </div>
                </div>

                {/* Profile rows */}
                <div>
                  {profile.finnhubIndustry  && <DetailRow label="Industry"   value={profile.finnhubIndustry} />}
                  {profile.country          && <DetailRow label="Country"    value={profile.country} />}
                  {profile.currency         && <DetailRow label="Currency"   value={profile.currency} />}
                  {profile.ipo              && <DetailRow label="IPO"        value={profile.ipo} />}
                  {profile.marketCapitalization > 0 && (
                    <DetailRow label="Mkt Cap" value={fmtMktCap(profile.marketCapitalization)} />
                  )}
                  {profile.shareOutstanding > 0 && (
                    <DetailRow label="Shares Out" value={`${(profile.shareOutstanding / 1000).toFixed(2)}B`} />
                  )}
                </div>

                {/* Quote rows */}
                {quote && (
                  <div>
                    <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Today</p>
                    <DetailRow label="Open"       value={`$${fmtP(quote.o)}`} />
                    <DetailRow label="High"       value={`$${fmtP(quote.h)}`} />
                    <DetailRow label="Low"        value={`$${fmtP(quote.l)}`} />
                    <DetailRow label="Prev Close" value={`$${fmtP(quote.pc)}`} />
                    <DetailRow
                      label="Change"
                      value={`${quote.d >= 0 ? '+' : ''}$${fmtP(quote.d)} (${quote.d >= 0 ? '+' : ''}${fmtP(quote.dp)}%)`}
                    />
                  </div>
                )}

                {/* Website */}
                {profile.weburl && (
                  <a
                    href={profile.weburl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 rounded-lg border border-sky-500/20 py-2 font-mono text-[11px] text-sky-400 transition-colors hover:bg-sky-500/8 hover:text-sky-300"
                  >
                    <ExternalLink className="h-3 w-3" />
                    {profile.weburl.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                  </a>
                )}
              </div>
            )}

            {!profileLoading && !profile && (
              <p className="py-10 text-center font-mono text-xs text-muted-foreground">No profile data</p>
            )}
          </div>
        )}

        {/* ════════════ NEWS ════════════ */}
        {tab === 'news' && (
          <div>
            {newsLoading && (
              <div className="space-y-2 p-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-16 animate-pulse rounded-lg bg-muted/60" />
                ))}
              </div>
            )}

            {!newsLoading && news.length === 0 && (
              <p className="py-10 text-center font-mono text-xs text-muted-foreground">No recent news</p>
            )}

            {news.map((item, i) => (
              <a
                key={i}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group block border-b border-border/40 px-3.5 py-3 transition-colors hover:bg-muted/30"
              >
                <p className="mb-1.5 text-xs font-medium leading-snug text-foreground line-clamp-3 group-hover:text-sky-500 transition-colors">
                  {item.headline}
                </p>
                <div className="flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground">
                  <span className="text-muted-foreground truncate max-w-[120px]">{item.source}</span>
                  <span>·</span>
                  <span className="shrink-0">{timeAgo(item.datetime)}</span>
                  <ExternalLink className="ml-auto h-2.5 w-2.5 shrink-0 opacity-0 group-hover:opacity-60 transition-opacity" />
                </div>
              </a>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
