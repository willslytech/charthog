import { NextRequest, NextResponse } from 'next/server';
import { fetchYahooCandles } from '@/lib/yahoo';
import type { Timeframe } from '@/lib/types';
import { YAHOO_TIMEFRAME_MAP } from '@/lib/types';

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get('symbol');
  const timeframe = req.nextUrl.searchParams.get('timeframe') as Timeframe | null;

  if (!symbol) {
    return NextResponse.json({ error: 'symbol is required' }, { status: 400 });
  }
  if (!timeframe || !(timeframe in YAHOO_TIMEFRAME_MAP)) {
    return NextResponse.json({ error: 'invalid timeframe' }, { status: 400 });
  }

  try {
    const data = await fetchYahooCandles(symbol.toUpperCase(), timeframe);
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch candles';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
