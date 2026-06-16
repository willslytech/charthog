export interface Holding {
  id: string;
  ticker: string;
  shares: number;
  avgCost: number;
  addedAt: number;
}

const KEY = 'charthog_portfolio';

export function getHoldings(): Holding[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]') as Holding[];
  } catch {
    return [];
  }
}

export function saveHoldings(holdings: Holding[]): void {
  localStorage.setItem(KEY, JSON.stringify(holdings));
}

export function addHolding(h: Omit<Holding, 'id' | 'addedAt'>): Holding {
  const next: Holding = { ...h, id: crypto.randomUUID(), addedAt: Date.now() };
  saveHoldings([...getHoldings(), next]);
  return next;
}

export function removeHolding(id: string): void {
  saveHoldings(getHoldings().filter(h => h.id !== id));
}
