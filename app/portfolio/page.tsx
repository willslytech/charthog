'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Plus, Trash2, TrendingUp, TrendingDown, DollarSign, BarChart2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getHoldings, addHolding, removeHolding, type Holding } from '@/lib/portfolioStore';

// ===== TYPES =====
interface LiveQuote {
  price: number;
  change: number;
  changePct: number;
}

// ===== HELPERS =====
function fmt(n: number, dec = 2): string {
  return n.toFixed(dec);
}
function fmtDollar(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? '−' : '';
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(1)}K`;
  return `${sign}$${abs.toFixed(2)}`;
}

// ===== ADD HOLDING MODAL =====
function AddModal({ onClose, onAdd }: { onClose: () => void; onAdd: () => void }) {
  const [ticker,  setTicker]  = useState('');
  const [shares,  setShares]  = useState('');
  const [cost,    setCost]    = useState('');
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const t = ticker.trim().toUpperCase();
    const s = parseFloat(shares);
    const c = parseFloat(cost);
    if (!t || isNaN(s) || s <= 0 || isNaN(c) || c <= 0) {
      setError('Please fill in all fields with valid values.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/quote?symbol=${t}`);
      const q   = await res.json();
      if (!q?.c) { setError(`Could not verify ticker "${t}". Check the symbol.`); setLoading(false); return; }
      addHolding({ ticker: t, shares: s, avgCost: c });
      onAdd();
      onClose();
    } catch {
      setError('Failed to verify ticker. Try again.');
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-card border border-border rounded-lg shadow-2xl p-6">
        <h2 className="text-sm font-bold text-foreground mb-4">Add Holding</h2>
        <div className="space-y-3">
          <div>
            <label className="text-[11px] text-muted-foreground uppercase tracking-wider">Ticker Symbol</label>
            <input
              className="mt-1 w-full bg-background border border-border rounded px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-sky-500 uppercase"
              placeholder="e.g. AAPL"
              value={ticker}
              onChange={e => setTicker(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && submit()}
            />
          </div>
          <div>
            <label className="text-[11px] text-muted-foreground uppercase tracking-wider">Shares</label>
            <input
              type="number"
              min="0.001"
              step="0.001"
              className="mt-1 w-full bg-background border border-border rounded px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-sky-500"
              placeholder="e.g. 10"
              value={shares}
              onChange={e => setShares(e.target.value)}
            />
          </div>
          <div>
            <label className="text-[11px] text-muted-foreground uppercase tracking-wider">Avg Cost Per Share ($)</label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              className="mt-1 w-full bg-background border border-border rounded px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-sky-500"
              placeholder="e.g. 150.00"
              value={cost}
              onChange={e => setCost(e.target.value)}
            />
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>
        <div className="flex gap-2 mt-5">
          <button
            onClick={onClose}
            className="flex-1 px-3 py-2 rounded border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={loading}
            className="flex-1 px-3 py-2 rounded bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold transition-colors disabled:opacity-50"
          >
            {loading ? 'Verifying…' : 'Add Holding'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ===== SUMMARY CARD =====
function SummaryCard({
  icon: Icon, label, value, sub, positive,
}: {
  icon: React.ElementType; label: string; value: string; sub?: string; positive?: boolean;
}) {
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-muted-foreground" />
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</span>
      </div>
      <div className={cn(
        'text-xl font-bold font-mono',
        positive === undefined ? 'text-foreground' : positive ? 'text-green-400' : 'text-red-400'
      )}>
        {value}
      </div>
      {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}

// ===== ALLOCATION BAR =====
function AllocationBar({ holdings, values }: { holdings: Holding[]; values: Record<string, number> }) {
  const total = holdings.reduce((sum, h) => sum + (values[h.id] ?? 0), 0);
  if (total <= 0) return null;

  const colors = [
    'bg-sky-500','bg-green-500','bg-amber-500','bg-purple-500','bg-red-500',
    'bg-teal-500','bg-orange-500','bg-indigo-500','bg-pink-500','bg-lime-500',
  ];

  return (
    <div className="mt-4">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Allocation</div>
      <div className="flex w-full h-4 rounded overflow-hidden gap-px">
        {holdings.map((h, i) => {
          const pct = ((values[h.id] ?? 0) / total) * 100;
          if (pct < 0.5) return null;
          return (
            <div
              key={h.id}
              style={{ width: `${pct}%` }}
              className={cn('h-full', colors[i % colors.length])}
              title={`${h.ticker}: ${pct.toFixed(1)}%`}
            />
          );
        })}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
        {holdings.map((h, i) => {
          const pct = ((values[h.id] ?? 0) / total) * 100;
          if (pct < 0.5) return null;
          return (
            <span key={h.id} className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <span className={cn('w-2.5 h-2.5 rounded-sm', colors[i % colors.length])} />
              {h.ticker} {pct.toFixed(1)}%
            </span>
          );
        })}
      </div>
    </div>
  );
}

// ===== MAIN PAGE =====
export default function PortfolioPage() {
  const [holdings, setHoldings]   = useState<Holding[]>([]);
  const [quotes,   setQuotes]     = useState<Record<string, LiveQuote>>({});
  const [showAdd,  setShowAdd]    = useState(false);
  const [fetching, setFetching]   = useState(false);

  const load = useCallback(() => {
    setHoldings(getHoldings());
  }, []);

  useEffect(() => { load(); }, [load]);

  // Fetch live quotes whenever holdings change
  useEffect(() => {
    if (holdings.length === 0) { setQuotes({}); return; }
    setFetching(true);
    const symbols = [...new Set(holdings.map(h => h.ticker))].join(',');
    fetch(`/api/quotes-batch?symbols=${symbols}`)
      .then(r => r.json())
      .then((data: { symbol?: string; regularMarketPrice?: number; regularMarketChange?: number; regularMarketChangePercent?: number }[]) => {
        const map: Record<string, LiveQuote> = {};
        const arr = Array.isArray(data) ? data : [];
        for (const q of arr) {
          if (!q.symbol) continue;
          map[q.symbol] = {
            price:     q.regularMarketPrice          ?? 0,
            change:    q.regularMarketChange         ?? 0,
            changePct: q.regularMarketChangePercent  ?? 0,
          };
        }
        setQuotes(map);
        setFetching(false);
      })
      .catch(() => setFetching(false));
  }, [holdings]);

  const remove = (id: string) => { removeHolding(id); load(); };

  // Derived metrics
  const costValues:    Record<string, number> = {};
  const marketValues:  Record<string, number> = {};
  const dayPnlValues:  Record<string, number> = {};

  for (const h of holdings) {
    const q = quotes[h.ticker];
    costValues[h.id]   = h.shares * h.avgCost;
    marketValues[h.id] = q ? h.shares * q.price   : h.shares * h.avgCost;
    dayPnlValues[h.id] = q ? h.shares * q.change  : 0;
  }

  const totalCost    = Object.values(costValues).reduce((a, b) => a + b, 0);
  const totalMarket  = Object.values(marketValues).reduce((a, b) => a + b, 0);
  const totalPnl     = totalMarket - totalCost;
  const totalPnlPct  = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;
  const dayPnl       = Object.values(dayPnlValues).reduce((a, b) => a + b, 0);

  return (
    <div className="min-h-screen bg-background px-6 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-bold text-foreground">My Portfolio</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {holdings.length} holding{holdings.length !== 1 ? 's' : ''} · stored locally
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Add Holding
        </button>
      </div>

      {/* Empty state */}
      {holdings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <BarChart2 className="w-12 h-12 text-muted-foreground/30" />
          <div>
            <p className="text-foreground font-medium mb-1">No holdings yet</p>
            <p className="text-sm text-muted-foreground">Add your first stock to start tracking your portfolio.</p>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Holding
          </button>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <SummaryCard icon={DollarSign} label="Portfolio Value"  value={fmtDollar(totalMarket)} />
            <SummaryCard icon={DollarSign} label="Total Invested"   value={fmtDollar(totalCost)} />
            <SummaryCard
              icon={totalPnl >= 0 ? TrendingUp : TrendingDown}
              label="Total P&L"
              value={`${totalPnl >= 0 ? '+' : ''}${fmtDollar(totalPnl)}`}
              sub={`${totalPnlPct >= 0 ? '+' : ''}${fmt(totalPnlPct)}%`}
              positive={totalPnl >= 0}
            />
            <SummaryCard
              icon={dayPnl >= 0 ? TrendingUp : TrendingDown}
              label="Day's P&L"
              value={`${dayPnl >= 0 ? '+' : ''}${fmtDollar(dayPnl)}`}
              positive={dayPnl >= 0}
            />
          </div>

          {/* Allocation bar */}
          <AllocationBar holdings={holdings} values={marketValues} />

          {/* Holdings table */}
          <div className="mt-6 overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="text-left px-4 py-2.5 font-medium">Symbol</th>
                  <th className="text-right px-3 py-2.5 font-medium">Shares</th>
                  <th className="text-right px-3 py-2.5 font-medium">Avg Cost</th>
                  <th className="text-right px-3 py-2.5 font-medium">Current</th>
                  <th className="text-right px-3 py-2.5 font-medium">Day Chg</th>
                  <th className="text-right px-3 py-2.5 font-medium">Mkt Value</th>
                  <th className="text-right px-3 py-2.5 font-medium">P&L</th>
                  <th className="text-right px-3 py-2.5 font-medium">P&L %</th>
                  <th className="text-right px-3 py-2.5 font-medium">Alloc</th>
                  <th className="px-3 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {holdings.map(h => {
                  const q      = quotes[h.ticker];
                  const mv     = marketValues[h.id];
                  const cv     = costValues[h.id];
                  const pnl    = mv - cv;
                  const pnlPct = cv > 0 ? (pnl / cv) * 100 : 0;
                  const dpnl   = dayPnlValues[h.id];
                  const dpct   = q?.changePct ?? 0;
                  const alloc  = totalMarket > 0 ? (mv / totalMarket) * 100 : 0;

                  return (
                    <tr key={h.id} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-2.5">
                        <Link href={`/stock/${h.ticker}`} className="font-bold text-sky-400 hover:underline">
                          {h.ticker}
                        </Link>
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono">{h.shares}</td>
                      <td className="px-3 py-2.5 text-right font-mono">${fmt(h.avgCost)}</td>
                      <td className="px-3 py-2.5 text-right font-mono">
                        {q ? `$${fmt(q.price)}` : fetching ? <span className="opacity-40">…</span> : '—'}
                      </td>
                      <td className={cn('px-3 py-2.5 text-right font-mono font-semibold', dpct >= 0 ? 'text-green-400' : 'text-red-400')}>
                        {q ? `${dpct >= 0 ? '+' : ''}${fmt(dpct)}%` : '—'}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono font-semibold">{fmtDollar(mv)}</td>
                      <td className={cn('px-3 py-2.5 text-right font-mono font-semibold', pnl >= 0 ? 'text-green-400' : 'text-red-400')}>
                        {pnl >= 0 ? '+' : ''}{fmtDollar(pnl)}
                      </td>
                      <td className={cn('px-3 py-2.5 text-right font-mono font-semibold', pnlPct >= 0 ? 'text-green-400' : 'text-red-400')}>
                        {pnlPct >= 0 ? '+' : ''}{fmt(pnlPct)}%
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-muted-foreground">{fmt(alloc, 1)}%</td>
                      <td className="px-3 py-2.5 text-right">
                        <button
                          onClick={() => remove(h.id)}
                          className="text-muted-foreground/50 hover:text-red-400 transition-colors"
                          title="Remove holding"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {showAdd && (
        <AddModal onClose={() => setShowAdd(false)} onAdd={load} />
      )}
    </div>
  );
}
