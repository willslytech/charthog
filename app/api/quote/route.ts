import { NextRequest, NextResponse } from 'next/server';
import { fetchQuote } from '@/lib/finnhub';

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get('symbol');
  if (!symbol) {
    return NextResponse.json({ error: 'symbol is required' }, { status: 400 });
  }
  try {
    const data = await fetchQuote(symbol.toUpperCase());
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch quote';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
