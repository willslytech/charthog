'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { AppNav } from '@/components/AppNav';
import { RefreshCw, TrendingUp, TrendingDown, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CandleBar } from '@/lib/types';

// ── Formatters ────────────────────────────────────────────────────────────────
const fmtP = (n: number) =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtPct = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
const fmtVol = (n: number) => {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return String(n);
};

// ── Sparkline SVG ─────────────────────────────────────────────────────────────
function Sparkline({ closes, up }: { closes: number[]; up: boolean }) {
  if (closes.length < 2) return <div className="h-[72px] w-full bg-slate-800/30 animate-pulse rounded" />;
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const rng = max - min || 1;
  const W = 280, H = 72, PAD = 4;
  const pts = closes
    .map((c, i) => [
      ((i / (closes.length - 1)) * W).toFixed(1),
      (H - PAD - ((c - min) / rng) * (H - PAD * 2)).toFixed(1),
    ])
    .map(([x, y]) => `${x},${y}`)
    .join(' ');
  const color = up ? '#22c55e' : '#ef4444';
  const fillId = `sp-${up ? 'u' : 'd'}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full" style={{ height: 72 }}>
      <defs>
        <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <polygon points={`0,${H} ${pts} ${W},${H}`} fill={`url(#${fillId})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

// ── Skeleton card ─────────────────────────────────────────────────────────────
function CardSkeleton() {
  return (
    <div className="animate-pulse rounded-xl border border-slate-800/80 bg-card p-4 flex flex-col gap-2">
      <div className="h-3 w-20 rounded bg-slate-800" />
      <div className="h-6 w-32 rounded bg-slate-800" />
      <div className="h-3 w-24 rounded bg-slate-800" />
      <div className="h-[72px] rounded bg-slate-800/60" />
    </div>
  );
}

// ── Index card ────────────────────────────────────────────────────────────────
const INDICES = [
  { label: 'DOW JONES',    sym: 'DIA',  sub: 'DJIA ETF' },
  { label: 'NASDAQ',       sym: 'QQQ',  sub: 'NASDAQ-100 ETF' },
  { label: 'S&P 500',      sym: 'SPY',  sub: 'S&P 500 ETF' },
  { label: 'RUSSELL 2000', sym: 'IWM',  sub: 'Small-cap ETF' },
];

interface QuoteData { c: number; d: number; dp: number; h: number; l: number; o: number; pc: number }

function IndexCard({
  label, sym, sub,
  quote, closes,
}: {
  label: string; sym: string; sub: string;
  quote: QuoteData | null; closes: number[];
}) {
  if (!quote) return <CardSkeleton />;
  const up = quote.dp >= 0;
  return (
    <Link
      href={`/chart`}
      className="block rounded-xl border border-slate-800/80 bg-card px-4 pt-3.5 pb-2 hover:border-slate-600/80 transition-colors group"
    >
      <div className="flex items-start justify-between mb-0.5">
        <div>
          <p className="text-[11px] font-bold tracking-wide text-slate-400 uppercase">{label}</p>
          <p className="font-mono font-black text-xl text-white leading-tight">
            ${fmtP(quote.c)}
          </p>
        </div>
        <span className="font-mono text-[10px] text-slate-600 pt-0.5">{sym}</span>
      </div>
      <div className={cn('font-mono text-xs font-semibold mb-1.5 flex items-center gap-1', up ? 'text-green-400' : 'text-red-400')}>
        {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
        {up ? '+' : ''}{fmtP(quote.d)} &nbsp;({fmtPct(quote.dp)})
      </div>
      <Sparkline closes={closes} up={up} />
      <div className="flex justify-between mt-1.5 font-mono text-[10px] text-slate-600">
        <span>H {fmtP(quote.h)}</span>
        <span className="text-slate-700">{sub}</span>
        <span>L {fmtP(quote.l)}</span>
      </div>
    </Link>
  );
}

// ── Sector grid ───────────────────────────────────────────────────────────────
const SECTORS = [
  { label: 'Technology',   sym: 'XLK'  },
  { label: 'Financials',   sym: 'XLF'  },
  { label: 'Healthcare',   sym: 'XLV'  },
  { label: 'Cons. Disc.',  sym: 'XLY'  },
  { label: 'Comm. Svcs.',  sym: 'XLC'  },
  { label: 'Industrials',  sym: 'XLI'  },
  { label: 'Energy',       sym: 'XLE'  },
  { label: 'Cons. Stpls.', sym: 'XLP'  },
  { label: 'Materials',    sym: 'XLB'  },
  { label: 'Real Estate',  sym: 'XLRE' },
  { label: 'Utilities',    sym: 'XLU'  },
];

function sectorBg(pct: number) {
  if (pct >=  3) return 'bg-green-500   text-white border-green-500/60';
  if (pct >=  1) return 'bg-green-700/80 text-green-100 border-green-700/40';
  if (pct >=  0) return 'bg-green-900/60 text-green-300 border-green-900/40';
  if (pct >= -1) return 'bg-red-900/60   text-red-300   border-red-900/40';
  if (pct >= -3) return 'bg-red-700/80   text-red-100   border-red-700/40';
  return                 'bg-red-500      text-white     border-red-500/60';
}

function SectorGrid({ quotes }: { quotes: Record<string, QuoteData | null> }) {
  return (
    <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-11 gap-1.5">
      {SECTORS.map(({ label, sym }) => {
        const q = quotes[sym];
        if (!q) return (
          <div key={sym} className="h-14 animate-pulse rounded-lg bg-slate-800/50 border border-slate-800/80" />
        );
        const up = q.dp >= 0;
        return (
          <div
            key={sym}
            className={cn(
              'rounded-lg border px-2 py-2 flex flex-col items-center justify-center gap-0.5 text-center cursor-default',
              sectorBg(q.dp)
            )}
          >
            <span className="text-[10px] font-bold leading-tight">{label}</span>
            <span className="font-mono text-xs font-black">{fmtPct(q.dp)}</span>
            <span className="font-mono text-[9px] opacity-70">{sym}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Gainers / Losers table ────────────────────────────────────────────────────
const POPULAR = [
  'AAPL','MSFT','NVDA','AMZN','GOOGL','META','TSLA','BRK-B',
  'JPM','V','UNH','XOM','LLY','JNJ','WMT','MA','HD','PG',
  'AMD','NFLX','AVGO','COST','MRK','CVX','ABBV','BAC','KO','PEP','DIS','GS',
];

interface StockRow { sym: string; price: number; change: number; pct: number }

function StockTable({
  title, rows, up,
}: { title: string; rows: StockRow[]; up: boolean }) {
  return (
    <div className="rounded-xl border border-slate-800/80 bg-card overflow-hidden">
      <div className={cn(
        'flex items-center gap-2 px-4 py-2.5 border-b border-slate-800/80',
        up ? 'bg-green-500/8' : 'bg-red-500/8'
      )}>
        {up
          ? <TrendingUp className="w-3.5 h-3.5 text-green-400" />
          : <TrendingDown className="w-3.5 h-3.5 text-red-400" />}
        <span className="font-mono text-xs font-bold tracking-wide uppercase text-white">{title}</span>
      </div>
      {/* Header */}
      <div className="grid grid-cols-4 px-4 py-1.5 border-b border-slate-800/50">
        {['Ticker', 'Last', 'Change', 'Volume'].map(h => (
          <span key={h} className="font-mono text-[10px] text-slate-600 uppercase tracking-wide">{h}</span>
        ))}
      </div>
      {/* Rows */}
      {rows.length === 0
        ? <p className="px-4 py-6 text-center font-mono text-xs text-slate-700">Loading…</p>
        : rows.slice(0, 10).map(r => (
          <Link
            key={r.sym}
            href="/chart"
            className="grid grid-cols-4 items-center px-4 py-2 border-b border-slate-800/30 last:border-0 hover:bg-slate-800/30 transition-colors group"
          >
            <span className="font-mono text-xs font-bold text-sky-400 group-hover:text-sky-300">{r.sym}</span>
            <span className="font-mono text-xs text-slate-200">${fmtP(r.price)}</span>
            <span className={cn('font-mono text-xs font-semibold', r.pct >= 0 ? 'text-green-400' : 'text-red-400')}>
              {fmtPct(r.pct)}
            </span>
            <span className="font-mono text-[10px] text-slate-500">—</span>
          </Link>
        ))
      }
    </div>
  );
}

// ── Market clock ──────────────────────────────────────────────────────────────
function MarketClock() {
  const [time, setTime] = useState('');
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTime(now.toLocaleString('en-US', {
        timeZone: 'America/New_York',
        weekday: 'short', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: true,
      }) + ' ET');
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="font-mono text-[11px] text-slate-500 tabular-nums">{time}</span>;
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function HomePage() {
  const [indexQuotes,  setIndexQuotes]  = useState<Record<string, QuoteData | null>>({});
  const [indexCandles, setIndexCandles] = useState<Record<string, number[]>>({});
  const [sectorQuotes, setSectorQuotes] = useState<Record<string, QuoteData | null>>({});
  const [stockQuotes,  setStockQuotes]  = useState<Record<string, QuoteData | null>>({});
  const [refreshing,   setRefreshing]   = useState(false);

  // ── Fetch index data ────────────────────────────────────────────────────────
  const loadIndices = useCallback(async () => {
    await Promise.all(
      INDICES.map(async ({ sym }) => {
        try {
          const [qRes, cRes] = await Promise.all([
            fetch(`/api/quote?symbol=${sym}`),
            fetch(`/api/candles?symbol=${sym}&timeframe=1D`),
          ]);
          const [q, c] = await Promise.all([qRes.json(), cRes.json()]);
          if (!q.error) setIndexQuotes(p => ({ ...p, [sym]: q }));
          if (Array.isArray(c)) setIndexCandles(p => ({ ...p, [sym]: c.map((b: CandleBar) => b.close) }));
        } catch { /* ignore */ }
      })
    );
  }, []);

  // ── Fetch sector quotes ─────────────────────────────────────────────────────
  const loadSectors = useCallback(async () => {
    for (const { sym } of SECTORS) {
      try {
        const res = await fetch(`/api/quote?symbol=${sym}`);
        const q   = await res.json();
        if (!q.error) setSectorQuotes(p => ({ ...p, [sym]: q }));
      } catch { /* ignore */ }
      await new Promise(r => setTimeout(r, 80));
    }
  }, []);

  // ── Fetch popular stocks ────────────────────────────────────────────────────
  const loadStocks = useCallback(async () => {
    for (const sym of POPULAR) {
      try {
        const res = await fetch(`/api/quote?symbol=${sym}`);
        const q   = await res.json();
        if (!q.error) setStockQuotes(p => ({ ...p, [sym]: q }));
      } catch { /* ignore */ }
      await new Promise(r => setTimeout(r, 80));
    }
  }, []);

  const loadAll = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadIndices(), loadSectors(), loadStocks()]);
    setRefreshing(false);
  }, [loadIndices, loadSectors, loadStocks]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ── Derive gainers / losers from fetched stock quotes ──────────────────────
  const stockRows: StockRow[] = POPULAR
    .filter(s => stockQuotes[s])
    .map(s => {
      const q = stockQuotes[s]!;
      return { sym: s, price: q.c, change: q.d, pct: q.dp };
    });

  const gainers = [...stockRows].sort((a, b) => b.pct - a.pct);
  const losers  = [...stockRows].sort((a, b) => a.pct - b.pct);

  return (
    <div className="min-h-screen flex flex-col bg-background text-white">
      <AppNav />

      {/* ── Page body ── */}
      <div className="flex-1 max-w-screen-2xl mx-auto w-full px-4 py-4 space-y-4">

        {/* ── Top bar ── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-sm font-bold text-white">Market Overview</h1>
            <p className="text-[11px] text-slate-500 font-mono">Real-time market snapshot</p>
          </div>
          <div className="flex items-center gap-3">
            <MarketClock />
            <button
              onClick={loadAll}
              disabled={refreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700/50 text-xs text-slate-400 hover:text-white hover:border-slate-600 transition-all disabled:opacity-50"
            >
              <RefreshCw className={cn('w-3 h-3', refreshing && 'animate-spin')} />
              Refresh
            </button>
          </div>
        </div>

        {/* ── 4 Index cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {INDICES.map(({ label, sym, sub }) => (
            <IndexCard
              key={sym}
              label={label} sym={sym} sub={sub}
              quote={indexQuotes[sym] ?? null}
              closes={indexCandles[sym] ?? []}
            />
          ))}
        </div>

        {/* ── Sector performance ── */}
        <div className="rounded-xl border border-slate-800/80 bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Sector Performance</h2>
            <div className="flex items-center gap-3 text-[10px] font-mono text-slate-600">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-green-500 inline-block" /> Bullish</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-red-500 inline-block" /> Bearish</span>
            </div>
          </div>
          <SectorGrid quotes={sectorQuotes} />
        </div>

        {/* ── Gainers / Losers ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pb-6">
          <StockTable title="Top Gainers" rows={gainers} up />
          <StockTable title="Top Losers"  rows={losers}  up={false} />
        </div>

      </div>
    </div>
  );
}
