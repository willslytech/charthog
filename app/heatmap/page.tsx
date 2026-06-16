'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

// ===== STOCK UNIVERSE =====
const SECTORS: { name: string; color: string; stocks: { t: string; n: string; cap: number }[] }[] = [
  {
    name: 'Technology', color: 'sky',
    stocks: [
      { t: 'AAPL',  n: 'Apple',       cap: 4500 },
      { t: 'MSFT',  n: 'Microsoft',   cap: 3100 },
      { t: 'NVDA',  n: 'NVIDIA',      cap: 2600 },
      { t: 'GOOGL', n: 'Alphabet',    cap: 2200 },
      { t: 'META',  n: 'Meta',        cap: 1600 },
      { t: 'AVGO',  n: 'Broadcom',    cap: 850  },
      { t: 'ORCL',  n: 'Oracle',      cap: 400  },
      { t: 'CRM',   n: 'Salesforce',  cap: 280  },
      { t: 'AMD',   n: 'AMD',         cap: 240  },
      { t: 'ADBE',  n: 'Adobe',       cap: 220  },
      { t: 'CSCO',  n: 'Cisco',       cap: 200  },
      { t: 'INTC',  n: 'Intel',       cap: 100  },
    ],
  },
  {
    name: 'Consumer Disc.', color: 'orange',
    stocks: [
      { t: 'AMZN', n: 'Amazon',     cap: 2600 },
      { t: 'TSLA', n: 'Tesla',      cap: 900  },
      { t: 'HD',   n: 'Home Depot', cap: 400  },
      { t: 'MCD',  n: "McDonald's", cap: 200  },
      { t: 'LOW',  n: "Lowe's",     cap: 160  },
      { t: 'NKE',  n: 'Nike',       cap: 140  },
      { t: 'SBUX', n: 'Starbucks',  cap: 100  },
    ],
  },
  {
    name: 'Healthcare', color: 'green',
    stocks: [
      { t: 'LLY',  n: 'Eli Lilly',    cap: 1100 },
      { t: 'UNH',  n: 'UnitedHealth', cap: 480  },
      { t: 'JNJ',  n: 'J&J',          cap: 380  },
      { t: 'ABBV', n: 'AbbVie',       cap: 300  },
      { t: 'MRK',  n: 'Merck',        cap: 280  },
      { t: 'TMO',  n: 'Thermo Fisher',cap: 200  },
      { t: 'PFE',  n: 'Pfizer',       cap: 170  },
    ],
  },
  {
    name: 'Financials', color: 'yellow',
    stocks: [
      { t: 'JPM',  n: 'JPMorgan',       cap: 720 },
      { t: 'V',    n: 'Visa',           cap: 600 },
      { t: 'MA',   n: 'Mastercard',     cap: 460 },
      { t: 'BAC',  n: 'BofA',           cap: 340 },
      { t: 'WFC',  n: 'Wells Fargo',    cap: 220 },
      { t: 'GS',   n: 'Goldman Sachs',  cap: 170 },
      { t: 'MS',   n: 'Morgan Stanley', cap: 150 },
    ],
  },
  {
    name: 'Consumer Staples', color: 'teal',
    stocks: [
      { t: 'WMT',  n: 'Walmart',   cap: 760 },
      { t: 'COST', n: 'Costco',    cap: 380 },
      { t: 'PG',   n: 'P&G',       cap: 380 },
      { t: 'KO',   n: 'Coca-Cola', cap: 280 },
      { t: 'PEP',  n: 'PepsiCo',   cap: 200 },
    ],
  },
  {
    name: 'Energy', color: 'amber',
    stocks: [
      { t: 'XOM', n: 'ExxonMobil',     cap: 460 },
      { t: 'CVX', n: 'Chevron',        cap: 300 },
      { t: 'COP', n: 'ConocoPhillips', cap: 140 },
      { t: 'SLB', n: 'SLB',           cap: 90  },
    ],
  },
  {
    name: 'Comm. Services', color: 'purple',
    stocks: [
      { t: 'NFLX', n: 'Netflix', cap: 380 },
      { t: 'DIS',  n: 'Disney',  cap: 200 },
      { t: 'T',    n: 'AT&T',   cap: 130 },
      { t: 'VZ',   n: 'Verizon', cap: 170 },
    ],
  },
  {
    name: 'Industrials', color: 'slate',
    stocks: [
      { t: 'GE',  n: 'GE Aerospace', cap: 220 },
      { t: 'CAT', n: 'Caterpillar',  cap: 180 },
      { t: 'RTX', n: 'RTX Corp',     cap: 150 },
      { t: 'HON', n: 'Honeywell',    cap: 140 },
      { t: 'BA',  n: 'Boeing',       cap: 130 },
      { t: 'UPS', n: 'UPS',          cap: 110 },
    ],
  },
];

const ALL_TICKERS = SECTORS.flatMap(s => s.stocks.map(st => st.t));

type QuoteMap = Record<string, { c: number; d: number; dp: number }>;

// ===== COLOR BY CHANGE % =====
function changeColor(dp: number | undefined): string {
  if (dp == null) return 'bg-muted/40 text-muted-foreground';
  if (dp >= 4)    return 'bg-green-700   text-white';
  if (dp >= 2)    return 'bg-green-600   text-white';
  if (dp >= 0.5)  return 'bg-green-500   text-white';
  if (dp >= 0)    return 'bg-green-900/80 text-green-300';
  if (dp >= -0.5) return 'bg-red-900/80  text-red-300';
  if (dp >= -2)   return 'bg-red-500     text-white';
  if (dp >= -4)   return 'bg-red-600     text-white';
  return 'bg-red-700 text-white';
}

// ===== TILE =====
function Tile({
  ticker, name, cap, quote, maxCap,
}: {
  ticker: string; name: string; cap: number; quote?: { d: number; dp: number }; maxCap: number;
}) {
  const size = Math.max(56, Math.round(56 + (cap / maxCap) * 80));
  const dp   = quote?.dp;
  const color = changeColor(dp);

  return (
    <Link href={`/stock/${ticker}`}>
      <div
        className={cn(
          'rounded flex flex-col items-center justify-center cursor-pointer transition-opacity hover:opacity-80 select-none',
          color,
        )}
        style={{ width: size, height: size, minWidth: size, minHeight: size }}
        title={`${name} (${ticker})`}
      >
        <span className={cn('font-bold leading-none', size >= 100 ? 'text-sm' : 'text-xs')}>{ticker}</span>
        {dp != null && (
          <span className={cn('leading-none mt-0.5', size >= 90 ? 'text-xs' : 'text-[9px]')}>
            {dp >= 0 ? '+' : ''}{dp.toFixed(2)}%
          </span>
        )}
      </div>
    </Link>
  );
}

// ===== MAIN =====
export default function HeatmapPage() {
  const [quotes, setQuotes] = useState<QuoteMap>({});
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState('');

  useEffect(() => {
    setLoading(true);
    const symbols = ALL_TICKERS.join(',');
    fetch(`/api/quotes-batch?symbols=${symbols}`)
      .then(r => r.json())
      .then((data: { symbol?: string; regularMarketPrice?: number; regularMarketChange?: number; regularMarketChangePercent?: number }[]) => {
        const map: QuoteMap = {};
        const arr = Array.isArray(data) ? data : [];
        for (const q of arr) {
          if (!q.symbol) continue;
          map[q.symbol] = {
            c:  q.regularMarketPrice          ?? 0,
            d:  q.regularMarketChange         ?? 0,
            dp: q.regularMarketChangePercent  ?? 0,
          };
        }
        setQuotes(map);
        setLastUpdated(new Date().toLocaleTimeString());
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const quoteList  = Object.values(quotes);
  const advancers  = quoteList.filter(q => q.dp > 0).length;
  const decliners  = quoteList.filter(q => q.dp < 0).length;
  const unchanged  = quoteList.length - advancers - decliners;

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-bold text-foreground">Market Heatmap</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            S&P 500 — colored by daily % change, sized by market cap
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-green-600 inline-block" />
            <span className="text-muted-foreground">{advancers} up</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-red-600 inline-block" />
            <span className="text-muted-foreground">{decliners} down</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-muted inline-block" />
            <span className="text-muted-foreground">{unchanged} flat</span>
          </span>
          {lastUpdated && (
            <span className="text-muted-foreground/60" suppressHydrationWarning>Updated {lastUpdated}</span>
          )}
        </div>
      </div>

      {/* Color legend */}
      <div className="flex items-center gap-2 mb-6 text-[10px]">
        <span className="text-muted-foreground">Scale:</span>
        {[
          { label: '−4%+', cls: 'bg-red-700'   },
          { label: '−2%',  cls: 'bg-red-600'   },
          { label: '−0.5%',cls: 'bg-red-500'   },
          { label: '0',    cls: 'bg-muted'      },
          { label: '+0.5%',cls: 'bg-green-500'  },
          { label: '+2%',  cls: 'bg-green-600'  },
          { label: '+4%+', cls: 'bg-green-700'  },
        ].map(({ label, cls }) => (
          <div key={label} className="flex items-center gap-1">
            <span className={cn('w-4 h-4 rounded-sm', cls)} />
            <span className="text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>

      {/* Sectors */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground text-sm animate-pulse">
          Loading market data…
        </div>
      ) : (
        <div className="space-y-6">
          {SECTORS.map(sector => {
            const maxCap = Math.max(...sector.stocks.map(s => s.cap));
            return (
              <div key={sector.name}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-semibold text-foreground">{sector.name}</span>
                  <div className="flex-1 h-px bg-border" />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {sector.stocks.map(st => (
                    <Tile
                      key={st.t}
                      ticker={st.t}
                      name={st.n}
                      cap={st.cap}
                      maxCap={maxCap}
                      quote={quotes[st.t]}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
