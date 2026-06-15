import { NextRequest, NextResponse } from 'next/server';

// Module-level crumb cache (lives for the lifetime of the serverless function instance)
let cachedCrumb: string | null = null;
let cachedCookie: string | null = null;
let crumbExpiry = 0;

async function getYahooCrumb(): Promise<{ crumb: string; cookie: string }> {
  const now = Date.now();
  if (cachedCrumb && cachedCookie && now < crumbExpiry) {
    return { crumb: cachedCrumb, cookie: cachedCookie };
  }

  // Step 1: visit Yahoo Finance to obtain a session cookie
  const homeRes = await fetch('https://fc.yahoo.com/', {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      Accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
    },
    redirect: 'follow',
  });

  // Collect all Set-Cookie headers
  const rawCookies: string[] = [];
  homeRes.headers.forEach((val, key) => {
    if (key.toLowerCase() === 'set-cookie') rawCookies.push(val.split(';')[0]);
  });
  const cookie = rawCookies.join('; ');

  // Step 2: get the crumb token
  const crumbRes = await fetch(
    'https://query1.finance.yahoo.com/v1/test/getcrumb',
    {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'application/json, text/plain, */*',
        Cookie: cookie,
      },
    }
  );

  const crumb = (await crumbRes.text()).trim();
  if (!crumb || crumb.includes('error') || crumb.length > 20) {
    throw new Error(`Failed to get Yahoo crumb: ${crumb.slice(0, 80)}`);
  }

  cachedCrumb = crumb;
  cachedCookie = cookie;
  crumbExpiry = now + 30 * 60 * 1000; // cache for 30 minutes

  return { crumb, cookie };
}

export async function GET(req: NextRequest) {
  const symbols = req.nextUrl.searchParams.get('symbols');
  if (!symbols) return NextResponse.json([]);

  try {
    const { crumb, cookie } = await getYahooCrumb();

    const url =
      `https://query1.finance.yahoo.com/v7/finance/quote` +
      `?symbols=${encodeURIComponent(symbols)}` +
      `&crumb=${encodeURIComponent(crumb)}` +
      `&region=US&lang=en-US&corsDomain=finance.yahoo.com`;

    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        Cookie: cookie,
        Referer: 'https://finance.yahoo.com/',
        Origin: 'https://finance.yahoo.com',
      },
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      // Crumb may have expired — clear cache and return empty so client retries
      cachedCrumb = null;
      cachedCookie = null;
      return NextResponse.json([]);
    }

    const data = await res.json();
    const quotes = data?.quoteResponse?.result ?? [];
    return NextResponse.json(quotes);
  } catch (err) {
    console.error('quotes-batch error:', err);
    return NextResponse.json([]);
  }
}
