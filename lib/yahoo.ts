import type { CandleBar, Timeframe } from './types';
import { YAHOO_TIMEFRAME_MAP } from './types';

const BASE = 'https://query1.finance.yahoo.com/v8/finance/chart';

function aggregateBars(bars: CandleBar[], n: number): CandleBar[] {
  const out: CandleBar[] = [];
  for (let i = 0; i < bars.length; i += n) {
    const chunk = bars.slice(i, i + n);
    if (!chunk.length) continue;
    out.push({
      time:   chunk[0].time,
      open:   chunk[0].open,
      high:   Math.max(...chunk.map(b => b.high)),
      low:    Math.min(...chunk.map(b => b.low)),
      close:  chunk[chunk.length - 1].close,
      volume: chunk.reduce((s, b) => s + b.volume, 0),
    });
  }
  return out;
}

export async function fetchYahooCandles(
  symbol: string,
  timeframe: Timeframe
): Promise<CandleBar[]> {
  const { interval, range, aggregate } = YAHOO_TIMEFRAME_MAP[timeframe];
  const url = `${BASE}/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}`;

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0',
      Accept: 'application/json',
    },
    next: { revalidate: 60 },
  });

  if (!res.ok) throw new Error(`Yahoo Finance error: ${res.status}`);

  const json = await res.json();
  const result = json?.chart?.result?.[0];
  if (!result) throw new Error('No data returned from Yahoo Finance');

  const timestamps: number[] = result.timestamp ?? [];
  const quote = result.indicators?.quote?.[0] ?? {};
  const opens: number[] = quote.open ?? [];
  const highs: number[] = quote.high ?? [];
  const lows: number[] = quote.low ?? [];
  const closes: number[] = quote.close ?? [];
  const volumes: number[] = quote.volume ?? [];

  const bars: CandleBar[] = [];
  for (let i = 0; i < timestamps.length; i++) {
    // Skip bars where Yahoo returns null (pre/post market gaps)
    if (closes[i] == null || opens[i] == null) continue;
    bars.push({
      time: timestamps[i],
      open: opens[i],
      high: highs[i],
      low: lows[i],
      close: closes[i],
      volume: volumes[i] ?? 0,
    });
  }

  return aggregate && aggregate > 1 ? aggregateBars(bars, aggregate) : bars;
}
