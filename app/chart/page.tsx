'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { SymbolSearch } from '@/components/SymbolSearch';
import { RightPanel } from '@/components/RightPanel';
import { AppNav } from '@/components/AppNav';
import { cn } from '@/lib/utils';
import { useTheme } from '@/components/ThemeProvider';
import type { CandleBar, StockQuote, Timeframe } from '@/lib/types';
import {
  TrendingUp,
  TrendingDown,
  RefreshCw,
  AlertCircle,
  BarChart2,
} from 'lucide-react';

// Dynamic import keeps lightweight-charts out of the SSR bundle
const StockChart = dynamic(
  () => import('@/components/StockChart').then((m) => m.StockChart),
  { ssr: false, loading: () => <ChartSkeleton /> }
);

const TIMEFRAMES: Timeframe[] = ['30M', '1H', '4H', '1D', '1W', '1M', '3M', '6M', '1Y', 'ALL'];


// ── Loading skeleton ──────────────────────────────────────
function ChartSkeleton() {
  return (
    <div className="w-full h-full bg-slate-800/30 rounded-xl animate-pulse flex items-center justify-center">
      <BarChart2 className="w-12 h-12 text-slate-700" />
    </div>
  );
}

// ── Stat pill ─────────────────────────────────────────────
function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs font-mono">
      <span className="text-slate-500">{label}</span>
      <span className="text-foreground">{value}</span>
    </div>
  );
}

// ── Format helpers ────────────────────────────────────────
const fmt = (n: number, decimals = 2) =>
  n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

const fmtVol = (n: number) => {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return String(n);
};

// ── Main page ─────────────────────────────────────────────
export default function Home() {
  const { theme } = useTheme();
  const [symbol, setSymbol] = useState('AAPL');
  const [symbolName, setSymbolName] = useState('Apple Inc.');
  const [timeframe, setTimeframe] = useState<Timeframe>('30M');
  const [candles, setCandles] = useState<CandleBar[]>([]);
  const [quote, setQuote] = useState<StockQuote | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hogIndicator, setHogIndicator] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Read ?symbol= from URL on mount (avoids useSearchParams Suspense requirement)
  useEffect(() => {
    const sym = new URLSearchParams(window.location.search).get('symbol');
    if (sym) { setSymbol(sym); setSymbolName(sym); }
  }, []);

  const fetchData = useCallback(
    async (sym: string, tf: Timeframe) => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      setLoading(true);
      setError(null);

      try {
        const [qRes, cRes] = await Promise.all([
          fetch(`/api/quote?symbol=${sym}`, { signal: ctrl.signal }),
          fetch(`/api/candles?symbol=${sym}&timeframe=${tf}`, { signal: ctrl.signal }),
        ]);

        const [qData, cData] = await Promise.all([qRes.json(), cRes.json()]);

        if (qData.error) throw new Error(qData.error);
        if (cData.error) throw new Error(cData.error);

        setQuote(qData as StockQuote);
        setCandles(cData as CandleBar[]);
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchData(symbol, timeframe);
  }, [symbol, timeframe, fetchData]);

  const handleSelect = (sym: string, desc: string) => {
    setSymbol(sym);
    setSymbolName(desc);
  };

  const isPositive = quote ? quote.dp >= 0 : true;
  const lastCandle = candles[candles.length - 1];
  const vol = candles.reduce((s, c) => s + c.volume, 0);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      {/* ── App nav ── */}
      <AppNav />

      {/* ── Chart sub-header: symbol search ── */}
      <header className="shrink-0 border-b border-border bg-background/80 backdrop-blur-md z-30">
        <div className="px-4 sm:px-6 h-11 flex items-center justify-end gap-4">
          <SymbolSearch value={symbol} onSelect={handleSelect} />
        </div>
      </header>

      {/* ── Body: chart + right panel ── */}
      <div className="flex flex-1 overflow-hidden">
      <main className="flex-1 min-w-0 overflow-y-auto px-4 sm:px-6 py-5 flex flex-col gap-4">

        {/* Error banner */}
        {error && (
          <div className="flex items-center gap-3 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
            <button
              onClick={() => fetchData(symbol, timeframe)}
              className="ml-auto flex items-center gap-1.5 text-xs font-medium hover:text-red-300 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Retry
            </button>
          </div>
        )}

        {/* ── Price card ── */}
        <div className="rounded-2xl border border-border bg-card px-5 py-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            {/* Symbol + name */}
            <div>
              <div className="flex items-baseline gap-3">
                <h1 className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-foreground">
                  {symbol}
                </h1>
                <span className="text-sm text-muted-foreground hidden sm:block">{symbolName}</span>
              </div>

              {quote ? (
                <div className="mt-1 flex items-baseline gap-3">
                  <span className="text-3xl sm:text-4xl font-bold font-mono text-foreground">
                    ${fmt(quote.c)}
                  </span>
                  <span
                    className={cn(
                      'flex items-center gap-1 text-base font-mono font-semibold',
                      isPositive ? 'dark:text-green-400 text-green-600' : 'dark:text-red-400 text-red-600'
                    )}
                  >
                    {isPositive ? (
                      <TrendingUp className="w-4 h-4" />
                    ) : (
                      <TrendingDown className="w-4 h-4" />
                    )}
                    {isPositive ? '+' : ''}
                    {fmt(quote.d)} ({isPositive ? '+' : ''}{fmt(quote.dp)}%)
                  </span>
                </div>
              ) : (
                <div className="mt-2 h-10 w-48 rounded-lg bg-muted dark:bg-slate-800/60 animate-pulse" />
              )}
            </div>

            {/* OHLCV stats */}
            {quote && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1 text-right sm:text-left mt-1">
                <StatPill label="O" value={`$${fmt(quote.o)}`} />
                <StatPill label="H" value={`$${fmt(quote.h)}`} />
                <StatPill label="L" value={`$${fmt(quote.l)}`} />
                <StatPill label="PC" value={`$${fmt(quote.pc)}`} />
                {vol > 0 && <StatPill label="Vol" value={fmtVol(vol)} />}
              </div>
            )}
          </div>
        </div>

        {/* ── Toolbar: timeframes + hog toggle ── */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          {/* Timeframe buttons */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-muted border border-border">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all duration-150',
                  timeframe === tf
                    ? 'bg-sky-500 text-white shadow-sm shadow-sky-500/30'
                    : 'text-muted-foreground hover:text-foreground hover:bg-background'
                )}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Controls: refresh + hog indicator */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchData(symbol, timeframe)}
              disabled={loading}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium',
                'border border-border text-muted-foreground hover:text-foreground hover:border-border/80',
                'transition-all duration-150 disabled:opacity-50'
              )}
              aria-label="Refresh"
            >
              <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            {/* Mega-Alpha toggle */}
            <button
              onClick={() => setHogIndicator((v) => !v)}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-150',
                hogIndicator
                  ? 'bg-green-500/10 border-green-500/40 text-green-400 shadow-sm shadow-green-500/20'
                  : 'border-border text-muted-foreground hover:text-foreground hover:border-border/80'
              )}
            >
              <span className="font-black text-[11px] leading-none">
                <span>C</span><span className="text-orange-400">H</span>
              </span>
              <span>Mega-Alpha</span>
              <span
                className={cn(
                  'w-1.5 h-1.5 rounded-full',
                  hogIndicator ? 'bg-green-400' : 'bg-slate-600'
                )}
              />
            </button>
          </div>
        </div>

        {/* ── Chart ── */}
        <div className="rounded-2xl border border-border bg-card p-2 sm:p-3 overflow-hidden">
          <StockChart data={candles} showHogIndicator={hogIndicator} height={440} isDark={theme === 'dark'} />
        </div>

        {/* ── Footer hint ── */}
        <p className="text-center text-xs text-slate-600 pb-4">
          Data via{' '}
          <a
            href="https://finnhub.io"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-500 hover:text-sky-500 transition-colors"
          >
            Finnhub
          </a>
          {' '}· ChartHog is not financial advice · 🐷
        </p>
      </main>

      {/* ── Right panel ── */}
      <aside className="hidden lg:flex w-72 xl:w-80 shrink-0 border-l border-border overflow-hidden flex-col">
        <RightPanel symbol={symbol} quote={quote} onSelectSymbol={handleSelect} />
      </aside>

      </div>
    </div>
  );
}
