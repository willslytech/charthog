import type { SearchResult, StockQuote } from './types';

const BASE = 'https://finnhub.io/api/v1';

function apiKey(): string {
  const key = process.env.FINNHUB_API_KEY;
  if (!key) throw new Error('FINNHUB_API_KEY environment variable is not set');
  return key;
}

export async function fetchQuote(symbol: string): Promise<StockQuote> {
  const url = `${BASE}/quote?symbol=${encodeURIComponent(symbol)}&token=${apiKey()}`;
  const res = await fetch(url, { next: { revalidate: 30 } });
  if (!res.ok) throw new Error(`Finnhub quote error: ${res.status}`);
  return res.json();
}

export async function searchSymbols(query: string): Promise<SearchResult[]> {
  const url = `${BASE}/search?q=${encodeURIComponent(query)}&token=${apiKey()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Finnhub search error: ${res.status}`);
  const data = await res.json();
  return (data.result ?? []).slice(0, 8) as SearchResult[];
}
