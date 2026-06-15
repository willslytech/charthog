'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const TAPE_SYMS = [
  'AAPL','MSFT','NVDA','AMZN','GOOGL','META','TSLA',
  'JPM','V','UNH','XOM','LLY','JNJ','WMT','MA',
  'AMD','NFLX','AVGO','COST','BAC','KO','PEP',
  'SPY','QQQ','GLD','GS','ORCL','ADBE','CRM','COIN',
];

interface TapeItem { symbol: string; price: number; pct: number }

export function TickerTape() {
  const [items, setItems] = useState<TapeItem[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/quotes-batch?symbols=${TAPE_SYMS.join(',')}`);
        if (!res.ok) return;
        const data: any[] = await res.json();
        setItems(
          data
            .filter(q => q.regularMarketPrice > 0)
            .map(q => ({
              symbol: q.symbol,
              price: q.regularMarketPrice,
              pct:   q.regularMarketChangePercent ?? 0,
            }))
        );
      } catch {}
    };
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, []);

  // skeleton strip while loading
  if (items.length === 0) {
    return <div className="h-7 bg-[#06090f] border-b border-slate-800/60" />;
  }

  // double the list so the loop is seamless
  const doubled = [...items, ...items];
  const duration = items.length * 3; // ~90s for 30 items — comfortable reading pace

  return (
    <div className="h-7 bg-[#06090f] border-b border-slate-800/60 overflow-hidden flex items-center select-none">
      <div
        className="flex items-center w-max"
        style={{ animation: `tickerScroll ${duration}s linear infinite` }}
      >
        {doubled.map((item, i) => (
          <Link
            key={`${item.symbol}-${i}`}
            href={`/chart?symbol=${item.symbol}`}
            className="flex items-center gap-1.5 px-5 font-mono text-[11px] hover:bg-white/5 h-7 transition-colors whitespace-nowrap border-r border-slate-800/40"
          >
            <span className="font-bold text-slate-300 tracking-wide">{item.symbol}</span>
            <span className="text-slate-400">
              ${item.price >= 1000
                ? item.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                : item.price.toFixed(2)}
            </span>
            <span className={item.pct >= 0 ? 'text-green-400' : 'text-red-400'}>
              {item.pct >= 0 ? '▲' : '▼'}{Math.abs(item.pct).toFixed(2)}%
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
