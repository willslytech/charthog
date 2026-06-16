'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ExternalLink, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

// ===== TYPES =====
interface Quote {
  c: number; d: number; dp: number; h: number; l: number; o: number; pc: number; v: number;
}
interface Profile {
  name: string; ticker: string; exchange: string; finnhubIndustry: string;
  weburl: string; logo: string; marketCapitalization: number; shareOutstanding: number;
  country: string; currency: string; description?: string; ipo?: string; phone?: string;
}
interface Metric {
  metric: {
    peBasicExclExtraTTM?: number; epsTTM?: number; beta?: number;
    '52WeekHigh'?: number; '52WeekLow'?: number; '10DayAverageTradingVolume'?: number;
    dividendYieldIndicatedAnnual?: number; revenuePerShareTTM?: number;
    pbAnnual?: number; psTTM?: number; netProfitMarginTTM?: number;
    roeTTM?: number; currentRatioAnnual?: number; totalDebt?: number;
  };
}
interface Article {
  id: number; datetime: number; headline: string; source: string; url: string;
}
interface CandleBar {
  time: number; open: number; high: number; low: number; close: number; volume: number;
}
type Candles = CandleBar[];

// ===== HELPERS =====
function fmt(n: number | undefined, decimals = 2): string {
  if (n == null || isNaN(n)) return '—';
  return n.toFixed(decimals);
}
function fmtBig(n: number | undefined): string {
  if (n == null || isNaN(n)) return '—';
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9)  return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6)  return `$${(n / 1e6).toFixed(2)}M`;
  return `$${n.toFixed(0)}`;
}
function fmtVol(n: number | undefined): string {
  if (n == null || isNaN(n)) return '—';
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return String(n);
}
function fmtTime(unix: number): string {
  const diff = Math.floor(Date.now() / 1000 - unix);
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(unix * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ===== SPARKLINE CHART =====
function PriceChart({ candles }: { candles: Candles | null }) {
  if (!candles || !Array.isArray(candles) || candles.length < 2) {
    return <div className="h-48 bg-muted/30 rounded flex items-center justify-center text-muted-foreground text-sm">No chart data</div>;
  }

  const prices = candles.map(b => b.close);
  const W = 600; const H = 160; const PAD = 8;
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;

  const pts = prices.map((p, i) => {
    const x = PAD + (i / (prices.length - 1)) * (W - PAD * 2);
    const y = H - PAD - ((p - min) / range) * (H - PAD * 2);
    return `${x},${y}`;
  });

  const pathD   = 'M' + pts.join('L');
  const areaD   = pathD + `L${W - PAD},${H - PAD}L${PAD},${H - PAD}Z`;
  const isUp    = prices[prices.length - 1] >= prices[0];
  const color   = isUp ? '#22c55e' : '#ef4444';
  const fillId  = `chart-fill-${Math.random().toString(36).slice(2)}`;

  return (
    <div className="w-full overflow-hidden rounded">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-48" preserveAspectRatio="none">
        <defs>
          <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0"   />
          </linearGradient>
        </defs>
        <path d={areaD} fill={`url(#${fillId})`} />
        <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" />
      </svg>
    </div>
  );
}

// ===== STAT PILL =====
function Stat({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className={cn('text-sm font-semibold text-foreground', mono && 'font-mono')}>{value}</span>
    </div>
  );
}

// ===== MAIN PAGE =====
export default function StockDetailPage() {
  const { ticker } = useParams<{ ticker: string }>();
  const sym = ticker?.toUpperCase() ?? '';

  const [data,     setData]    = useState<{ profile: Profile; metrics: Metric; quote: Quote } | null>(null);
  const [candles,  setCandles] = useState<Candles | null>(null);
  const [news,     setNews]    = useState<Article[]>([]);
  const [loading,  setLoading] = useState(true);
  const [error,    setError]   = useState('');

  useEffect(() => {
    if (!sym) return;
    setLoading(true);
    setError('');

    Promise.all([
      fetch(`/api/financials?symbol=${sym}`).then(r => r.json()),
      fetch(`/api/candles?symbol=${sym}&timeframe=3M`).then(r => r.json()).catch(() => null),
      fetch(`/api/news?symbol=${sym}`).then(r => r.json()).catch(() => []),
    ]).then(([fin, cdl, nws]) => {
      if (!fin?.profile?.name) { setError(`No data found for ${sym}`); setLoading(false); return; }
      setData(fin);
      setCandles(cdl);
      setNews(Array.isArray(nws) ? nws.slice(0, 8) : []);
      setLoading(false);
    }).catch(e => { setError(String(e)); setLoading(false); });
  }, [sym]);

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-muted-foreground text-sm animate-pulse">Loading {sym}…</div>
    </div>
  );

  if (error || !data) return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
      <p className="text-muted-foreground">{error || 'Not found'}</p>
      <Link href="/screener" className="text-sky-400 hover:underline text-sm">← Back to Screener</Link>
    </div>
  );

  const { profile, metrics, quote } = data;
  const m   = metrics?.metric ?? {};
  const up  = quote.dp >= 0;
  const mkt = profile.marketCapitalization ? fmtBig(profile.marketCapitalization * 1e6) : '—';

  return (
    <div className="min-h-screen bg-background">
      {/* Back link */}
      <div className="px-6 pt-4 pb-2">
        <Link href="/screener" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Screener
        </Link>
      </div>

      {/* Hero header */}
      <div className="px-6 pb-6 border-b border-border">
        <div className="flex items-start gap-4">
          {profile.logo && (
            <img
              src={profile.logo} alt={profile.name}
              className="w-12 h-12 rounded object-contain bg-white p-1 border border-border"
              onError={e => (e.currentTarget.style.display = 'none')}
            />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-baseline gap-3">
              <h1 className="text-2xl font-bold text-foreground">{sym}</h1>
              <span className="text-base text-muted-foreground truncate">{profile.name}</span>
              <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">{profile.finnhubIndustry}</span>
            </div>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <span className="text-3xl font-bold text-foreground font-mono">${fmt(quote.c)}</span>
              <div className={cn('flex items-center gap-1 text-base font-semibold', up ? 'text-green-400' : 'text-red-400')}>
                {up ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                {up ? '+' : ''}{fmt(quote.d)} ({up ? '+' : ''}{fmt(quote.dp)}%)
              </div>
              <span className="text-xs text-muted-foreground">{profile.exchange} · {profile.currency}</span>
              {profile.weburl && (
                <a href={profile.weburl} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-sky-400 hover:underline">
                  {profile.weburl.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Key stats row */}
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-x-6 gap-y-3 mt-6 pt-4 border-t border-border">
          <Stat label="Open"     value={`$${fmt(quote.o)}`} />
          <Stat label="High"     value={`$${fmt(quote.h)}`} />
          <Stat label="Low"      value={`$${fmt(quote.l)}`} />
          <Stat label="Prev Close" value={`$${fmt(quote.pc)}`} />
          <Stat label="Volume"   value={fmtVol(quote.v)} />
          <Stat label="Mkt Cap"  value={mkt} />
          <Stat label="P/E"      value={fmt(m.peBasicExclExtraTTM)} />
          <Stat label="Beta"     value={fmt(m.beta)} />
          <Stat label="EPS"      value={m.epsTTM != null ? `$${fmt(m.epsTTM)}` : '—'} />
          <Stat label="52W High" value={m['52WeekHigh'] != null ? `$${fmt(m['52WeekHigh'])}` : '—'} />
          <Stat label="52W Low"  value={m['52WeekLow'] != null ? `$${fmt(m['52WeekLow'])}` : '—'} />
          <Stat label="Div Yield" value={m.dividendYieldIndicatedAnnual != null ? `${fmt(m.dividendYieldIndicatedAnnual)}%` : '—'} />
          <Stat label="P/B"      value={fmt(m.pbAnnual)} />
          <Stat label="P/S"      value={fmt(m.psTTM)} />
          <Stat label="Net Margin" value={m.netProfitMarginTTM != null ? `${fmt(m.netProfitMarginTTM)}%` : '—'} />
          <Stat label="ROE"      value={m.roeTTM != null ? `${fmt(m.roeTTM)}%` : '—'} />
        </div>
      </div>

      {/* Chart + News grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-border">
        {/* Chart */}
        <div className="lg:col-span-2 p-6">
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Price (90 days)</h2>
          <PriceChart candles={candles} />
        </div>

        {/* News */}
        <div className="p-6">
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Recent News</h2>
          {news.length === 0 ? (
            <p className="text-xs text-muted-foreground">No recent news.</p>
          ) : (
            <div className="space-y-3">
              {news.map(a => (
                <div key={a.id} className="border-b border-border/30 pb-3 last:border-0 last:pb-0">
                  <a
                    href={a.url} target="_blank" rel="noopener noreferrer"
                    className="text-xs leading-snug text-sky-400 hover:text-sky-300 hover:underline line-clamp-3"
                  >
                    {a.headline}
                  </a>
                  <p className="text-[10px] text-muted-foreground mt-1" suppressHydrationWarning>
                    {a.source} · {fmtTime(a.datetime)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* About */}
      {profile.name && (
        <div className="px-6 py-6 border-t border-border">
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">About</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            <Stat label="Sector"   value={profile.finnhubIndustry || '—'} />
            <Stat label="Exchange" value={profile.exchange        || '—'} />
            <Stat label="Country"  value={profile.country         || '—'} />
            <Stat label="IPO Date" value={profile.ipo             || '—'} />
          </div>
          {profile.description && (
            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-4 max-w-3xl">
              {profile.description}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
