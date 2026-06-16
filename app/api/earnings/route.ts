import { NextRequest, NextResponse } from 'next/server';

function key() {
  const k = process.env.FINNHUB_API_KEY;
  if (!k) throw new Error('FINNHUB_API_KEY not set');
  return k;
}

function isoDate(offsetDays = 0) {
  return new Date(Date.now() + offsetDays * 864e5).toISOString().split('T')[0];
}

export async function GET(req: NextRequest) {
  const from = req.nextUrl.searchParams.get('from') ?? isoDate(-3);
  const to   = req.nextUrl.searchParams.get('to')   ?? isoDate(14);

  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/calendar/earnings?from=${from}&to=${to}&token=${key()}`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) return NextResponse.json({ earningsCalendar: [] });
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ earningsCalendar: [] });
  }
}
