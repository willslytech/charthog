'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { LandingCanvas } from '@/components/LandingCanvas';

// ── Pig mascot ────────────────────────────────────────────────────────────────
function PigLogo({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <ellipse cx="9"  cy="14" rx="7" ry="7" fill="#fb923c" />
      <ellipse cx="31" cy="14" rx="7" ry="7" fill="#fb923c" />
      <ellipse cx="9"  cy="14" rx="4" ry="4" fill="#fde68a" />
      <ellipse cx="31" cy="14" rx="4" ry="4" fill="#fde68a" />
      <circle cx="20" cy="23" r="16" fill="#fb923c" />
      <circle cx="14" cy="20" r="2.5" fill="#fff" />
      <circle cx="26" cy="20" r="2.5" fill="#fff" />
      <circle cx="14.8" cy="20.8" r="1.3" fill="#0f172a" />
      <circle cx="26.8" cy="20.8" r="1.3" fill="#0f172a" />
      <ellipse cx="20" cy="28" rx="7" ry="5" fill="#fcd5a0" />
      <circle cx="17" cy="28.5" r="1.6" fill="#c2410c" />
      <circle cx="23" cy="28.5" r="1.6" fill="#c2410c" />
    </svg>
  );
}

// ── Bottom ticker band ────────────────────────────────────────────────────────
const TICKERS = [
  { sym: 'AAPL',    p: '189.42',  c: '+2.41%', up: true  },
  { sym: 'TSLA',    p: '248.97',  c: '-1.83%', up: false },
  { sym: 'NVDA',    p: '912.34',  c: '+5.21%', up: true  },
  { sym: 'MSFT',    p: '421.07',  c: '+1.14%', up: true  },
  { sym: 'AMZN',    p: '198.63',  c: '-0.62%', up: false },
  { sym: 'META',    p: '534.18',  c: '+3.34%', up: true  },
  { sym: 'SPY',     p: '541.22',  c: '+0.78%', up: true  },
  { sym: 'QQQ',     p: '468.91',  c: '+1.22%', up: true  },
  { sym: 'GOOG',    p: '182.45',  c: '+1.73%', up: true  },
  { sym: 'JPM',     p: '214.82',  c: '-0.94%', up: false },
  { sym: 'GS',      p: '481.23',  c: '+0.44%', up: true  },
  { sym: 'BTC-USD', p: '67,842',  c: '+3.12%', up: true  },
  { sym: 'NFLX',    p: '628.04',  c: '+2.09%', up: true  },
  { sym: 'AMD',     p: '174.88',  c: '+4.18%', up: true  },
  { sym: 'DIS',     p: '112.36',  c: '-0.77%', up: false },
  { sym: 'BAC',     p: '38.92',   c: '-0.31%', up: false },
];

function TickerBand() {
  // Duplicate for seamless infinite scroll
  const items = [...TICKERS, ...TICKERS];
  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 overflow-hidden border-t border-green-500/20 bg-black/90 backdrop-blur-sm">
      <div className="flex" style={{ animation: 'tickerScroll 40s linear infinite' }}>
        {items.map((t, i) => (
          <div
            key={i}
            className="flex shrink-0 items-center gap-2 border-r border-slate-800/50 px-5 py-2.5"
          >
            <span className="font-mono text-xs font-bold text-white">{t.sym}</span>
            <span className="font-mono text-xs text-slate-500">${t.p}</span>
            <span
              className={`font-mono text-xs font-semibold ${
                t.up ? 'text-green-400' : 'text-red-400'
              }`}
            >
              {t.c}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Stat counter ──────────────────────────────────────────────────────────────
function StatCounter({
  value,
  label,
}: {
  value: string;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span
        className="font-mono font-black text-2xl text-white"
        style={{ textShadow: '0 0 20px rgba(34,197,94,0.4)' }}
      >
        {value}
      </span>
      <span className="text-xs text-slate-500 tracking-widest uppercase font-mono">{label}</span>
    </div>
  );
}

// ── Landing page ──────────────────────────────────────────────────────────────
export default function LandingPage() {
  const [mouse, setMouse] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      setMouse({
        x: (e.clientX / window.innerWidth - 0.5) * 28,
        y: (e.clientY / window.innerHeight - 0.5) * 14,
      });
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050816] text-white select-none">
      {/* Cinematic canvas background */}
      <LandingCanvas />

      {/* CRT scanlines */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.035]"
        style={{
          zIndex: 1,
          backgroundImage:
            'repeating-linear-gradient(0deg,transparent,transparent 2px,#000 2px,#000 4px)',
        }}
      />

      {/* Vignette */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          zIndex: 1,
          background:
            'radial-gradient(ellipse 80% 80% at 50% 46%, transparent 30%, rgba(5,8,22,0.82) 100%)',
        }}
      />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="fixed left-0 right-0 top-0 z-40 flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2.5">
          <PigLogo size={30} />
          <span className="text-lg font-bold tracking-tight">
            Chart<span className="text-orange-400">Hog</span>
          </span>
        </div>
        <Link href="/chart">
          <button className="rounded-lg border border-slate-700/60 px-4 py-1.5 font-mono text-sm text-slate-400 transition-all duration-150 hover:border-slate-500 hover:text-white">
            Open App →
          </button>
        </Link>
      </header>

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <main
        className="relative flex min-h-screen flex-col items-center justify-center pb-16 px-4 text-center"
        style={{ zIndex: 20 }}
      >
        {/* Parallax wrapper — follows mouse */}
        <div
          style={{
            transform: `translate(${mouse.x}px, ${mouse.y}px)`,
            transition: 'transform 0.12s ease-out',
          }}
        >
          {/* Live status badge */}
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1.5 font-mono text-xs text-green-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-400" />
            LIVE · NYSE · NASDAQ · 8,000+ SYMBOLS
          </div>

          {/* Pig */}
          <div
            className="mb-6 flex justify-center"
            style={{ filter: 'drop-shadow(0 0 40px rgba(251,146,60,0.55))' }}
          >
            <PigLogo size={96} />
          </div>

          {/* Title */}
          <h1
            className="mb-3 font-black leading-none tracking-tight"
            style={{ fontSize: 'clamp(4rem, 12vw, 9rem)', textShadow: '0 0 80px rgba(255,255,255,0.1)' }}
          >
            Chart
            <span
              className="text-orange-400"
              style={{ textShadow: '0 0 60px rgba(251,146,60,0.65), 0 0 120px rgba(251,146,60,0.25)' }}
            >
              Hog
            </span>
          </h1>

          <p className="mb-2 text-xl font-light tracking-wide text-slate-300 sm:text-2xl">
            The Stock Trader&apos;s Edge
          </p>
          <p className="mb-10 font-mono text-xs uppercase tracking-[0.22em] text-slate-600">
            Real‑time data · Mega‑Alpha signals · Zero cost
          </p>

          {/* CTA */}
          <Link href="/chart">
            <button
              className="group relative rounded-xl px-10 py-4 text-lg font-bold text-black transition-all duration-200 active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                boxShadow:
                  '0 0 40px rgba(34,197,94,0.50), 0 0 80px rgba(34,197,94,0.22), inset 0 1px 0 rgba(255,255,255,0.15)',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.boxShadow =
                  '0 0 60px rgba(34,197,94,0.70), 0 0 120px rgba(34,197,94,0.35), inset 0 1px 0 rgba(255,255,255,0.2)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.boxShadow =
                  '0 0 40px rgba(34,197,94,0.50), 0 0 80px rgba(34,197,94,0.22), inset 0 1px 0 rgba(255,255,255,0.15)';
              }}
            >
              Enter the Floor
              <span className="ml-2 inline-block transition-transform duration-150 group-hover:translate-x-1.5">
                →
              </span>
            </button>
          </Link>

          <p className="mt-5 font-mono text-xs text-slate-700">
            Powered by Finnhub &amp; Yahoo Finance · No account required
          </p>
        </div>

        {/* Stats row — outside parallax so it feels anchored */}
        <div
          className="absolute bottom-24 left-0 right-0 flex justify-center gap-12 border-t border-slate-800/60 pt-8"
          style={{ transition: `transform 0.18s ease-out`, transform: `translate(${mouse.x * 0.3}px, ${mouse.y * 0.3}px)` }}
        >
          <StatCounter value="8,000+" label="Symbols" />
          <StatCounter value="10"     label="Timeframes" />
          <StatCounter value="5"      label="Alpha Signals" />
          <StatCounter value="Free"   label="Always" />
        </div>
      </main>

      {/* ── Bottom ticker ────────────────────────────────────────────────────── */}
      <TickerBand />
    </div>
  );
}
