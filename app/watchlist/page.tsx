'use client';

import { AppNav } from '@/components/AppNav';
import { ListChecks } from 'lucide-react';

export default function WatchlistPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-white">
      <AppNav />
      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-4">
        <div className="w-14 h-14 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
          <ListChecks className="w-7 h-7 text-sky-400" />
        </div>
        <h1 className="text-xl font-bold text-white">Watchlists</h1>
        <p className="text-sm text-slate-500 max-w-xs">
          Full watchlist management — custom lists, alerts, and portfolio tracking — coming soon.
        </p>
        <p className="text-xs text-slate-700 font-mono">
          Your current watchlist lives in the right panel on the Charts page.
        </p>
      </div>
    </div>
  );
}
