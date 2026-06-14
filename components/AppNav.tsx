'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

function PigLogo({ size = 24 }: { size?: number }) {
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

const NAV_LINKS = [
  { label: 'Home',       href: '/home'      },
  { label: 'Charts',     href: '/chart'     },
  { label: 'Watchlists', href: '/watchlist' },
];

// Future tabs — greyed out so users can see what's coming
const FUTURE_LINKS = ['Screener', 'Portfolio', 'Insider', 'News'];

export function AppNav() {
  const path = usePathname();

  return (
    <nav className="sticky top-0 z-40 h-10 border-b border-slate-800/80 bg-[#0b0f1a]/95 backdrop-blur-md flex items-center">
      <div className="flex items-center w-full px-4 gap-0.5">

        {/* Logo */}
        <Link
          href="/home"
          className="flex items-center gap-1.5 mr-4 text-white font-bold text-sm shrink-0 hover:opacity-90 transition-opacity"
        >
          <PigLogo size={22} />
          <span>Chart<span className="text-orange-400">Hog</span></span>
        </Link>

        {/* Active nav */}
        {NAV_LINKS.map(link => {
          const active = path === link.href || (link.href !== '/home' && path.startsWith(link.href));
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'px-3 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap',
                active
                  ? 'bg-slate-700/70 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              )}
            >
              {link.label}
            </Link>
          );
        })}

        {/* Divider */}
        <div className="mx-2 h-4 w-px bg-slate-700/60 shrink-0" />

        {/* Coming-soon tabs */}
        {FUTURE_LINKS.map(label => (
          <span
            key={label}
            className="px-3 py-1 text-xs text-slate-700 cursor-not-allowed whitespace-nowrap select-none"
            title="Coming soon"
          >
            {label}
          </span>
        ))}
      </div>
    </nav>
  );
}
