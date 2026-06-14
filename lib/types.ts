export interface StockQuote {
  c: number;   // current price
  d: number;   // change
  dp: number;  // percent change
  h: number;   // high of day
  l: number;   // low of day
  o: number;   // open of day
  pc: number;  // previous close
  t: number;   // timestamp
}

export interface CandleBar {
  time: number;   // UTC seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface SearchResult {
  description: string;
  displaySymbol: string;
  symbol: string;
  type: string;
}

export type Timeframe = '30M' | '1H' | '4H' | '1D' | '1W' | '1M' | '3M' | '6M' | '1Y' | 'ALL';

export interface YahooTimeframeConfig {
  interval: string;
  range: string;
  aggregate?: number; // combine N raw bars into 1 (e.g. 4×1h → 4h)
}

export const YAHOO_TIMEFRAME_MAP: Record<Timeframe, YahooTimeframeConfig> = {
  '30M': { interval: '30m', range: '5d' },
  '1H':  { interval: '60m', range: '1mo' },
  '4H':  { interval: '1h',  range: '6mo', aggregate: 4 },
  '1D':  { interval: '5m',  range: '1d' },
  '1W':  { interval: '15m', range: '5d' },
  '1M':  { interval: '60m', range: '1mo' },
  '3M':  { interval: '1d',  range: '3mo' },
  '6M':  { interval: '1d',  range: '6mo' },
  '1Y':  { interval: '1wk', range: '1y' },
  'ALL': { interval: '1mo', range: 'max' },
};
