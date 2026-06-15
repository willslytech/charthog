export interface SavedWatchlist {
  id: string;
  name: string;
  symbols: string[];
  createdAt: number;
}

const KEY = 'charthog_saved_watchlists';

export function getWatchlists(): SavedWatchlist[] {
  if (typeof window === 'undefined') return [];
  try {
    const s = localStorage.getItem(KEY);
    return s ? (JSON.parse(s) as SavedWatchlist[]) : [];
  } catch {
    return [];
  }
}

export function saveWatchlists(lists: SavedWatchlist[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY, JSON.stringify(lists));
}
