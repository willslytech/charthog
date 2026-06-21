'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sun, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/components/ThemeProvider';
import { TickerTape } from '@/components/TickerTape';


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
          className="flex items-center mr-6 font-black text-xl shrink-0 hover:opacity-90 transition-opacity text-foreground"
        >
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
