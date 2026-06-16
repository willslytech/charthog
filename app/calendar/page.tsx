'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

// ===== TYPES =====
interface EarningsEntry {
  symbol: string;
  date: string;
  hour: string;
  epsEstimate: number | null;
  epsActual: number | null;
  revenueEstimate: number | null;
  revenueActual: number | null;
  year?: number;
  quarter?: number;
}

interface EconEvent {
  date: string;
  time: string;
  event: string;
  actual: string | null;
  prev: string | null;
  est: string | null;
  impact: 'high' | 'medium' | 'low';
}

// ===== MOCK ECONOMIC CALENDAR =====
const today = new Date();
function dStr(offset: number) {
  const d = new Date(today);
  d.setDate(d.getDate() + offset);
  return d.toISOString().split('T')[0];
}

const ECON_EVENTS: EconEvent[] = [
  { date: dStr(0),  time: '8:30 AM',  event: 'Initial Jobless Claims',   actual: '225K', prev: '231K', est: '228K', impact: 'medium' },
  { date: dStr(1),  time: '10:00 AM', event: 'Consumer Sentiment (UoM)', actual: null,   prev: '57.9', est: '59.2', impact: 'medium' },
  { date: dStr(3),  time: '8:30 AM',  event: 'Retail Sales MoM',         actual: null,   prev: '0.1%', est: '0.3%', impact: 'high'   },
  { date: dStr(3),  time: '2:00 PM',  event: 'Fed Meeting Minutes',       actual: null,   prev: null,   est: null,   impact: 'high'   },
  { date: dStr(5),  time: '8:30 AM',  event: 'Housing Starts',           actual: null,   prev: '1.36M',est: '1.38M',impact: 'medium' },
  { date: dStr(6),  time: '8:30 AM',  event: 'Philadelphia Fed Mfg',     actual: null,   prev: '-10.9',est: '-5.0', impact: 'medium' },
  { date: dStr(7),  time: '10:00 AM', event: 'Existing Home Sales',      actual: null,   prev: '4.02M',est: '4.05M',impact: 'medium' },
  { date: dStr(10), time: '8:30 AM',  event: 'Nonfarm Payrolls',         actual: null,   prev: '139K', est: '185K', impact: 'high'   },
  { date: dStr(10), time: '8:30 AM',  event: 'Unemployment Rate',        actual: null,   prev: '4.2%', est: '4.2%', impact: 'high'   },
  { date: dStr(10), time: '8:30 AM',  event: 'Avg Hourly Earnings MoM',  actual: null,   prev: '0.2%', est: '0.3%', impact: 'high'   },
  { date: dStr(12), time: '8:30 AM',  event: 'CPI MoM',                  actual: null,   prev: '0.2%', est: '0.2%', impact: 'high'   },
  { date: dStr(12), time: '8:30 AM',  event: 'Core CPI MoM',             actual: null,   prev: '0.3%', est: '0.3%', impact: 'high'   },
  { date: dStr(13), time: '8:30 AM',  event: 'PPI MoM',                  actual: null,   prev: '-0.5%',est: '0.2%', impact: 'medium' },
  { date: dStr(14), time: '10:00 AM', event: 'Consumer Confidence',      actual: null,   prev: '98.0', est: '99.5', impact: 'medium' },
  { date: dStr(17), time: '8:30 AM',  event: 'GDP Growth Rate QoQ (F)',  actual: null,   prev: '2.4%', est: '2.1%', impact: 'high'   },
  { date: dStr(17), time: '8:30 AM',  event: 'Durable Goods Orders MoM', actual: null,   prev: '-1.2%',est: '0.5%', impact: 'medium' },
  { date: dStr(18), time: '8:30 AM',  event: 'Core PCE Price Index MoM', actual: null,   prev: '0.3%', est: '0.2%', impact: 'high'   },
  { date: dStr(18), time: '8:30 AM',  event: 'Personal Income MoM',      actual: null,   prev: '0.5%', est: '0.4%', impact: 'medium' },
  { date: dStr(21), time: '10:00 AM', event: 'ISM Manufacturing PMI',    actual: null,   prev: '48.7', est: '49.2', impact: 'high'   },
  { date: dStr(22), time: '10:00 AM', event: 'JOLTS Job Openings',       actual: null,   prev: '7.19M',est: '7.30M',impact: 'high'   },
];

// ===== HELPERS =====
function fmtDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function fmtEps(n: number | null): string {
  if (n == null) return '—';
  return (n >= 0 ? '' : '−') + '$' + Math.abs(n).toFixed(2);
}

function fmtRev(n: number | null): string {
  if (n == null) return '—';
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  return `$${n.toFixed(0)}`;
}

function surprise(est: number | null, act: number | null): string {
  if (est == null || act == null || est === 0) return '—';
  const pct = ((act - est) / Math.abs(est)) * 100;
  return (pct >= 0 ? '+' : '') + pct.toFixed(1) + '%';
}

function surpriseColor(est: number | null, act: number | null): string {
  if (est == null || act == null) return 'text-muted-foreground';
  return act >= est ? 'text-green-400' : 'text-red-400';
}

// ===== EARNINGS TABLE =====
function EarningsCalendar() {
  const [entries, setEntries] = useState<EarningsEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState<'all' | 'upcoming' | 'reported'>('all');

  useEffect(() => {
    fetch('/api/earnings')
      .then(r => r.json())
      .then((d: { earningsCalendar?: EarningsEntry[] }) => {
        const arr = d?.earningsCalendar ?? [];
        const sorted = arr
          .filter(e => e.symbol && e.date)
          .sort((a, b) => a.date.localeCompare(b.date));
        setEntries(sorted);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const todayStr = new Date().toISOString().split('T')[0];
  const filtered = entries.filter(e => {
    if (filter === 'upcoming') return e.date >= todayStr;
    if (filter === 'reported') return e.date < todayStr;
    return true;
  });

  // Group by date
  const byDate: Record<string, EarningsEntry[]> = {};
  for (const e of filtered) {
    (byDate[e.date] ??= []).push(e);
  }

  return (
    <div>
      {/* Filter row */}
      <div className="flex gap-2 mb-4">
        {(['all', 'upcoming', 'reported'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'px-3 py-1 rounded text-xs font-medium capitalize transition-colors',
              filter === f
                ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted border border-transparent'
            )}
          >
            {f}
          </button>
        ))}
        <span className="ml-auto text-xs text-muted-foreground self-center">
          {filtered.length} earnings {filter === 'upcoming' ? 'upcoming' : filter === 'reported' ? 'reported' : 'total'}
        </span>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-8 bg-muted/40 rounded" />
          ))}
        </div>
      ) : Object.keys(byDate).length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">No earnings data available.</div>
      ) : (
        <div className="space-y-4">
          {Object.entries(byDate).map(([date, rows]) => (
            <div key={date}>
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 border-b border-border/50 pb-1">
                {fmtDate(date)}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-[10px] text-muted-foreground uppercase tracking-wider">
                      <th className="text-left py-1 pr-3 font-medium">Symbol</th>
                      <th className="text-center py-1 pr-3 font-medium">Time</th>
                      <th className="text-right py-1 pr-3 font-medium">EPS Est</th>
                      <th className="text-right py-1 pr-3 font-medium">EPS Act</th>
                      <th className="text-right py-1 pr-3 font-medium">Surprise</th>
                      <th className="text-right py-1 pr-3 font-medium">Rev Est</th>
                      <th className="text-right py-1 font-medium">Rev Act</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((e, i) => (
                      <tr key={i} className="border-b border-border/20 hover:bg-muted/20 transition-colors">
                        <td className="py-1.5 pr-3">
                          <Link href={`/stock/${e.symbol}`} className="font-bold text-sky-400 hover:underline">
                            {e.symbol}
                          </Link>
                          {e.quarter && e.year && (
                            <span className="ml-1.5 text-[10px] text-muted-foreground">Q{e.quarter} {e.year}</span>
                          )}
                        </td>
                        <td className="py-1.5 pr-3 text-center text-muted-foreground">
                          {e.hour === 'amc' ? 'AMC' : e.hour === 'bmo' ? 'BMO' : '—'}
                        </td>
                        <td className="py-1.5 pr-3 text-right font-mono">{fmtEps(e.epsEstimate)}</td>
                        <td className="py-1.5 pr-3 text-right font-mono">{fmtEps(e.epsActual)}</td>
                        <td className={cn('py-1.5 pr-3 text-right font-mono font-semibold', surpriseColor(e.epsEstimate, e.epsActual))}>
                          {surprise(e.epsEstimate, e.epsActual)}
                        </td>
                        <td className="py-1.5 pr-3 text-right font-mono">{fmtRev(e.revenueEstimate)}</td>
                        <td className="py-1.5 text-right font-mono">{fmtRev(e.revenueActual)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ===== ECONOMIC CALENDAR =====
function EconomicCalendar() {
  const byDate: Record<string, EconEvent[]> = {};
  for (const e of ECON_EVENTS) {
    (byDate[e.date] ??= []).push(e);
  }

  const impactDot: Record<string, string> = {
    high:   'bg-red-500',
    medium: 'bg-yellow-500',
    low:    'bg-muted-foreground',
  };

  const actualColor = (e: EconEvent): string => {
    if (!e.actual || !e.est) return 'text-foreground';
    const act  = parseFloat(e.actual);
    const est  = parseFloat(e.est);
    if (isNaN(act) || isNaN(est)) return 'text-foreground';
    return act >= est ? 'text-green-400' : 'text-red-400';
  };

  return (
    <div>
      <div className="flex items-center gap-4 mb-4 text-xs">
        <span className="text-muted-foreground text-[11px]">Impact:</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" /> High</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-yellow-500 inline-block" /> Medium</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-muted-foreground inline-block" /> Low</span>
      </div>
      <div className="space-y-4">
        {Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b)).map(([date, events]) => (
          <div key={date}>
            <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 border-b border-border/50 pb-1">
              {fmtDate(date)}
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  <th className="text-left py-1 pr-3 font-medium w-4">&nbsp;</th>
                  <th className="text-left py-1 pr-3 font-medium">Time</th>
                  <th className="text-left py-1 pr-3 font-medium flex-1">Event</th>
                  <th className="text-right py-1 pr-3 font-medium">Actual</th>
                  <th className="text-right py-1 pr-3 font-medium">Estimate</th>
                  <th className="text-right py-1 font-medium">Previous</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e, i) => (
                  <tr key={i} className="border-b border-border/20 hover:bg-muted/20 transition-colors">
                    <td className="py-1.5 pr-2">
                      <span className={cn('w-2 h-2 rounded-full inline-block', impactDot[e.impact])} />
                    </td>
                    <td className="py-1.5 pr-3 text-muted-foreground whitespace-nowrap">{e.time}</td>
                    <td className="py-1.5 pr-3 font-medium text-foreground">{e.event}</td>
                    <td className={cn('py-1.5 pr-3 text-right font-mono font-semibold', actualColor(e))}>
                      {e.actual ?? <span className="text-muted-foreground/50">—</span>}
                    </td>
                    <td className="py-1.5 pr-3 text-right font-mono text-muted-foreground">{e.est ?? '—'}</td>
                    <td className="py-1.5 text-right font-mono text-muted-foreground">{e.prev ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
}

// ===== PAGE =====
type Tab = 'earnings' | 'economic';

export default function CalendarPage() {
  const [tab, setTab] = useState<Tab>('earnings');

  return (
    <div className="min-h-screen bg-background">
      {/* Header tabs */}
      <div className="sticky top-16 z-30 flex items-center gap-0 px-6 pt-3 border-b border-border bg-background/95 backdrop-blur-sm">
        {([
          { key: 'earnings', label: 'Earnings Calendar' },
          { key: 'economic', label: 'Economic Calendar' },
        ] as { key: Tab; label: string }[]).map((t, i) => (
          <span key={t.key} className="flex items-center">
            {i > 0 && <span className="text-border/50 mx-3 text-sm select-none">|</span>}
            <button
              onClick={() => setTab(t.key)}
              className={cn(
                'pb-2.5 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap',
                tab === t.key
                  ? 'text-sky-400 border-sky-400'
                  : 'text-muted-foreground border-transparent hover:text-foreground'
              )}
            >
              {t.label}
            </button>
          </span>
        ))}
      </div>

      <div className="px-6 py-6">
        {tab === 'earnings' ? <EarningsCalendar /> : <EconomicCalendar />}
      </div>
    </div>
  );
}
