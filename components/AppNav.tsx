'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sun, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/components/ThemeProvider';
import { TickerTape } from '@/components/TickerTape';

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
  { label: 'Screener',   href: '/screener'  },
  { label: 'Heatmap',   href: '/heatmap'   },
  { label: 'Insider',    href: '/insider'   },
  { label: 'News',       href: '/news'      },
  { label: 'Calendar',   href: '/calendar'  },
  { label: 'Portfolio',  href: '/portfolio' },
];

const FUTURE_LINKS: string[] = [];

export function AppNav() {
  const path = usePathname();
  const { theme, toggle } = useTheme();

  return (
    <nav className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border">
      <TickerTape />
      <div className="h-10 flex items-center w-full px-4 gap-0.5">

        {/* Logo */}
        <Link
          href="/home"
          className="flex items-center gap-1.5 mr-4 font-bold text-sm shrink-0 hover:opacity-90 transition-opacity text-foreground"
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
                  ? 'bg-primary/10 text-primary dark:bg-slate-700/70 dark:text-white'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              {link.label}
            </Link>
          );
        })}

        <div className="flex-1" />

        {/* Light / dark toggle */}
        <button
          onClick={toggle}
          aria-label="Toggle theme"
          className={cn(
            'flex items-center justify-center w-7 h-7 rounded-md border transition-colors',
            'border-border text-muted-foreground hover:text-foreground hover:bg-muted'
          )}
        >
          {theme === 'dark'
            ? <Sun className="w-3.5 h-3.5" />
            : <Moon className="w-3.5 h-3.5" />
          }
        </button>
      </div>
    </nav>
  );
}
