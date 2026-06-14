import { NextRequest, NextResponse } from 'next/server';
import { searchSymbols } from '@/lib/finnhub';

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('q');
  if (!query || query.trim().length < 1) {
    return NextResponse.json([]);
  }
  try {
    const results = await searchSymbols(query.trim());
    return NextResponse.json(results);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Search failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
