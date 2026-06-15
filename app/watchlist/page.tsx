'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { AppNav } from '@/components/AppNav';
import {
  Plus, X, Trash2, RefreshCw, BarChart2, Edit3, Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StockQuote } from '@/lib/types';
import {
  type SavedWatchlist,
  getWatchlists,
  saveWatchlists,
} from '@/lib/watchlistStore';

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtP = (n: number) =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function parseSymbols(raw: string): string[] {
  return raw
    .split(/[,\s]+/)
    .map(s => s.trim().toUpperCase().replace(/[^A-Z0-9.\-]/g, ''))
    .filter(Boolean);
}

// ── Static heatmap for the promo banner ───────────────────────────────────────
function PromoHeatmap() {
  return (
    <div className="grid gap-0.5 h-full" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gridTemplateRows: 'repeat(3, 1fr)' }}>
      <div className="col-span-1 row-span-2 rounded bg-green-600 flex flex-col items-center justify-center">
        <span className="text-white font-bold text-sm leading-none">NVDA</span>
        <span className="text-green-200 text-[10px] mt-0.5">+5.21%</span>
      </div>
      <div className="rounded bg-green-700 flex flex-col items-center justify-center">
        <span className="text-white font-bold text-xs leading-none">AAPL</span>
        <span className="text-green-200 text-[10px] mt-0.5">+1.44%</span>
      </div>
      <div className="row-span-2 rounded bg-green-600 flex flex-col items-center justify-center">
        <span className="text-white font-bold text-xs leading-none">META</span>
        <span className="text-green-200 text-[10px] mt-0.5">+2.08%</span>
      </div>
      <div className="rounded bg-red-700 flex flex-col items-center justify-center">
        <span className="text-white font-bold text-xs leading-none">TSLA</span>
        <span className="text-red-200 text-[10px] mt-0.5">−2.31%</span>
      </div>
      <div className="rounded bg-green-800 flex flex-col items-center justify-center">
        <span className="text-white font-bold text-xs leading-none">AMZN</span>
        <span className="text-green-200 text-[10px] mt-0.5">+0.91%</span>
      </div>
      <div className="rounded bg-red-800/90 flex flex-col items-center justify-center">
        <span className="text-white font-bold text-xs leading-none">MSFT</span>
        <span className="text-red-300 text-[10px] mt-0.5">−0.44%</span>
      </div>
      <div className="rounded bg-red-700 flex flex-col items-center justify-center">
        <span className="text-white font-bold text-xs leading-none">V</span>
        <span className="text-red-200 text-[10px] mt-0.5">−1.94%</span>
      </div>
      <div className="rounded bg-green-500 flex flex-col items-center justify-center">
        <span className="text-white font-bold text-xs leading-none">AMD</span>
        <span className="text-green-100 text-[10px] mt-0.5">+4.18%</span>
      </div>
    </div>
  );
}

// ── Name-watchlist modal ───────────────────────────────────────────────────────
function NameModal({
  onConfirm,
  onCancel,
}: {
  onConfirm: (name: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState('My Watchlist');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-slate-700/60 bg-slate-900 p-6 shadow-2xl">
        <h3 className="mb-1 text-sm font-bold text-white">Name Your Watchlist</h3>
        <p className="mb-4 text-xs text-slate-500">Give this watchlist a name before saving.</p>
        <input
          ref={inputRef}
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && name.trim()) onConfirm(name.trim());
            if (e.key === 'Escape') onCancel();
          }}
          className="mb-4 w-full rounded-lg border border-slate-700/60 bg-slate-800 px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:border-sky-500/60 focus:outline-none"
        />
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => name.trim() && onConfirm(name.trim())}
            disabled={!name.trim()}
            className="px-4 py-1.5 rounded-lg bg-sky-500 text-xs font-semibold text-white hover:bg-sky-400 transition-colors disabled:opacity-40"
          >
            Create Watchlist
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Editable watchlist name ───────────────────────────────────────────────────
function EditableName({
  value,
  onSave,
}: {
  value: string;
  onSave: (v: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      setDraft(value);
      setTimeout(() => inputRef.current?.select(), 0);
    }
  }, [editing, value]);

  const commit = () => {
    const v = draft.trim() || value;
    onSave(v);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <input
          ref={inputRef}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={e => {
            if (e.key === 'Enter') commit();
            if (e.key === 'Escape') setEditing(false);
          }}
          className="rounded border border-sky-500/60 bg-background px-2 py-1 text-sm font-semibold text-foreground focus:outline-none w-44"
        />
        <button onClick={commit} className="text-sky-400 hover:text-sky-300">
          <Check className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="group flex items-center gap-1.5 rounded border border-transparent px-2 py-1 text-sm font-semibold text-foreground hover:border-border hover:bg-muted transition-colors"
    >
      {value}
      <Edit3 className="w-3 h-3 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
    </button>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function WatchlistPage() {
  const [watchlists, setWatchlists] = useState<SavedWatchlist[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tickerInput, setTickerInput] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [pendingSymbols, setPendingSymbols] = useState<string[]>([]);
  const [quotes, setQuotes] = useState<Record<string, StockQuote | null>>({});
  const [loadingQuotes, setLoadingQuotes] = useState(false);
  const cancelRef = useRef(false);

  // Load from localStorage on mount
  useEffect(() => {
    const lists = getWatchlists();
    setWatchlists(lists);
    if (lists.length > 0) setSelectedId(lists[0].id);
  }, []);

  const selected = watchlists.find(w => w.id === selectedId) ?? null;

  // Fetch quotes for selected watchlist symbols
  const fetchQuotes = useCallback(async (symbols: string[]) => {
    if (!symbols.length) return;
    cancelRef.current = false;
    setLoadingQuotes(true);
    for (const sym of symbols) {
      if (cancelRef.current) break;
      try {
        const res = await fetch(`/api/quote?symbol=${sym}`);
        const q = await res.json();
        if (!q.error) setQuotes(prev => ({ ...prev, [sym]: q as StockQuote }));
        else setQuotes(prev => ({ ...prev, [sym]: null }));
      } catch {
        setQuotes(prev => ({ ...prev, [sym]: null }));
      }
      await new Promise(r => setTimeout(r, 100));
    }
    setLoadingQuotes(false);
  }, []);

  useEffect(() => {
    if (!selected) return;
    cancelRef.current = true;
    setQuotes({});
    fetchQuotes(selected.symbols);
    return () => { cancelRef.current = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, selected?.symbols.length]);

  // ── Mutations ──────────────────────────────────────────────────────────────
  const mutate = (next: SavedWatchlist[]) => {
    setWatchlists(next);
    saveWatchlists(next);
  };

  const handleAddTickers = () => {
    const syms = parseSymbols(tickerInput);
    if (!syms.length) return;

    if (selected) {
      // Add to existing watchlist
      mutate(watchlists.map(w =>
        w.id === selectedId
          ? { ...w, symbols: [...new Set([...w.symbols, ...syms])] }
          : w
      ));
      setTickerInput('');
      fetchQuotes(syms);
    } else {
      // New watchlist — ask for name
      setPendingSymbols(syms);
      setShowModal(true);
    }
  };

  const handleConfirmName = (name: string) => {
    const newList: SavedWatchlist = {
      id: crypto.randomUUID(),
      name,
      symbols: pendingSymbols,
      createdAt: Date.now(),
    };
    const next = [...watchlists, newList];
    mutate(next);
    setSelectedId(newList.id);
    setPendingSymbols([]);
    setTickerInput('');
    setShowModal(false);
  };

  const handleRename = (id: string, name: string) => {
    mutate(watchlists.map(w => (w.id === id ? { ...w, name } : w)));
  };

  const handleDeleteWatchlist = (id: string) => {
    const next = watchlists.filter(w => w.id !== id);
    mutate(next);
    if (selectedId === id) setSelectedId(next[0]?.id ?? null);
  };

  const handleRemoveSymbol = (sym: string) => {
    if (!selectedId) return;
    mutate(watchlists.map(w =>
      w.id === selectedId ? { ...w, symbols: w.symbols.filter(s => s !== sym) } : w
    ));
  };

  const handleNewWatchlist = () => {
    setSelectedId(null);
    setTickerInput('');
  };

  const isEmpty = watchlists.length === 0;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <AppNav />

      {showModal && (
        <NameModal
          onConfirm={handleConfirmName}
          onCancel={() => { setShowModal(false); setPendingSymbols([]); }}
        />
      )}

      {/* ── Top bar ── */}
      <div className="shrink-0 border-b border-border dark:border-slate-800/60 bg-card px-4 py-2 flex items-center gap-2 flex-wrap">
        {/* Watchlist name or placeholder */}
        {selected ? (
          <EditableName
            value={selected.name}
            onSave={name => handleRename(selected.id, name)}
          />
        ) : (
          <span className="px-2 py-1 text-sm font-semibold text-muted-foreground/50 w-44 inline-block">
            New Watchlist
          </span>
        )}

        {/* Separator */}
        <div className="h-4 w-px bg-border mx-1" />

        {/* Ticker input + Add Tickers */}
        <input
          value={tickerInput}
          onChange={e => setTickerInput(e.target.value.toUpperCase())}
          onKeyDown={e => e.key === 'Enter' && handleAddTickers()}
          placeholder="AAPL, MSFT, TSLA, ..."
          className="flex-1 min-w-48 rounded-lg border border-border dark:border-slate-700/50 bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-sky-500/60 focus:outline-none font-mono"
        />
        <button
          onClick={handleAddTickers}
          disabled={!tickerInput.trim()}
          className="shrink-0 px-4 py-1.5 rounded-lg bg-sky-500 text-sm font-semibold text-white hover:bg-sky-400 transition-colors disabled:opacity-40"
        >
          Add Tickers
        </button>

        {/* New Watchlist button (only when one is selected) */}
        {selected && (
          <button
            onClick={handleNewWatchlist}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border dark:border-slate-700/50 text-xs text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
          >
            <Plus className="w-3 h-3" />
            New Watchlist
          </button>
        )}
      </div>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Sidebar */}
        {!isEmpty && (
          <aside className="w-52 shrink-0 border-r border-border dark:border-slate-800/60 flex flex-col bg-card overflow-y-auto">
            <div className="p-2 space-y-0.5">
              {watchlists.map(wl => (
                <button
                  key={wl.id}
                  onClick={() => setSelectedId(wl.id)}
                  className={cn(
                    'group w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors',
                    selectedId === wl.id
                      ? 'bg-sky-500/10 border border-sky-500/30 text-sky-400'
                      : 'hover:bg-muted text-muted-foreground hover:text-foreground border border-transparent'
                  )}
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold truncate leading-tight">{wl.name}</p>
                    <p className="text-[10px] text-muted-foreground/50 font-mono">
                      {wl.symbols.length} symbol{wl.symbols.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); handleDeleteWatchlist(wl.id); }}
                    className="opacity-0 group-hover:opacity-100 shrink-0 ml-1 text-muted-foreground/40 hover:text-red-400 transition-all"
                    title="Delete watchlist"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </button>
              ))}
            </div>
          </aside>
        )}

        {/* Main */}
        <main className="flex-1 overflow-auto flex flex-col">
          {isEmpty ? (
            /* ── Empty state promo ── */
            <div className="flex items-start justify-center pt-10 px-4">
              <div
                className="w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl"
                style={{
                  background:
                    'linear-gradient(135deg, #312e81 0%, #1e3a5f 45%, #0f4c3a 100%)',
                }}
              >
                <div className="flex min-h-[220px]">
                  {/* Left: text */}
                  <div className="flex-1 p-8">
                    <h2 className="text-lg font-bold text-white leading-snug">
                      Create your first watchlist,
                    </h2>
                    <h2 className="text-lg font-bold text-white mb-5 leading-snug">
                      take control of your investment strategy
                    </h2>
                    <ul className="space-y-2.5 text-sm text-blue-100">
                      <li className="flex items-start gap-2.5">
                        <span className="mt-[5px] w-1.5 h-1.5 rounded-full bg-blue-300 shrink-0" />
                        <span>
                          Use <strong className="text-white">Watchlist</strong> as a filter in{' '}
                          <strong className="text-white">Full-screen Charts</strong> and{' '}
                          <strong className="text-white">Screener</strong>
                        </span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <span className="mt-[5px] w-1.5 h-1.5 rounded-full bg-blue-300 shrink-0" />
                        <span>
                          Check your investment performance with{' '}
                          <strong className="text-white">interactive maps</strong>
                        </span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <span className="mt-[5px] w-1.5 h-1.5 rounded-full bg-blue-300 shrink-0" />
                        <span>
                          Stay up-to-date on{' '}
                          <strong className="text-white">market news related to your stocks</strong>
                        </span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <span className="mt-[5px] w-1.5 h-1.5 rounded-full bg-blue-300 shrink-0" />
                        <span>
                          Set <strong className="text-white">alerts</strong> for breaking news, new{' '}
                          <strong className="text-white">analyst ratings</strong>, and{' '}
                          <strong className="text-white">insider trading updates</strong>
                        </span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <span className="mt-[5px] w-1.5 h-1.5 rounded-full bg-blue-300 shrink-0" />
                        <span>
                          Keep track of your <strong className="text-white">stock transactions</strong>
                        </span>
                      </li>
                    </ul>
                  </div>

                  {/* Right: heatmap */}
                  <div className="w-44 shrink-0 p-3">
                    <PromoHeatmap />
                  </div>
                </div>
              </div>
            </div>
          ) : selected ? (
            /* ── Selected watchlist table ── */
            <>
              {/* Table header bar */}
              <div className="shrink-0 flex items-center justify-between px-4 py-2 border-b border-border dark:border-slate-800/60">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-foreground">{selected.name}</span>
                  <span className="text-[11px] text-muted-foreground font-mono">
                    {selected.symbols.length} stock{selected.symbols.length !== 1 ? 's' : ''}
                  </span>
                  <span className="hidden sm:flex items-center gap-2 text-[11px] text-muted-foreground/60 font-mono">
                    <span>·</span>
                    <Link
                      href={`/screener?watchlistId=${selected.id}`}
                      className="text-sky-400 hover:text-sky-300 transition-colors"
                    >
                      Open in Screener
                    </Link>
                    <span>·</span>
                    <Link
                      href={`/chart?watchlistId=${selected.id}`}
                      className="text-sky-400 hover:text-sky-300 transition-colors"
                    >
                      Open in Charts
                    </Link>
                  </span>
                </div>
                <button
                  onClick={() => fetchQuotes(selected.symbols)}
                  disabled={loadingQuotes}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
                >
                  <RefreshCw className={cn('w-3 h-3', loadingQuotes && 'animate-spin')} />
                  Refresh
                </button>
              </div>

              {/* Table */}
              <div className="flex-1 overflow-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-border dark:border-slate-800/60 bg-muted/30 dark:bg-[#07101d]/90 sticky top-0 z-10">
                      <th className="px-3 py-2 w-8 text-left text-[10px] font-mono text-muted-foreground/50">#</th>
                      <th className="px-3 py-2 text-left text-[10px] font-mono text-muted-foreground uppercase tracking-wide">Ticker</th>
                      <th className="px-3 py-2 text-right text-[10px] font-mono text-muted-foreground uppercase tracking-wide">Price</th>
                      <th className="px-3 py-2 text-right text-[10px] font-mono text-muted-foreground uppercase tracking-wide">Chg</th>
                      <th className="px-3 py-2 text-right text-[10px] font-mono text-muted-foreground uppercase tracking-wide">Chg%</th>
                      <th className="px-3 py-2 text-right text-[10px] font-mono text-muted-foreground uppercase tracking-wide hidden sm:table-cell">Open</th>
                      <th className="px-3 py-2 text-right text-[10px] font-mono text-muted-foreground uppercase tracking-wide hidden md:table-cell">High</th>
                      <th className="px-3 py-2 text-right text-[10px] font-mono text-muted-foreground uppercase tracking-wide hidden md:table-cell">Low</th>
                      <th className="px-3 py-2 text-right text-[10px] font-mono text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Prev Close</th>
                      <th className="px-3 py-2 text-center text-[10px] font-mono text-muted-foreground uppercase tracking-wide">Chart</th>
                      <th className="px-3 py-2 text-center text-[10px] font-mono text-muted-foreground uppercase tracking-wide">Remove</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.symbols.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="py-16 text-center text-sm text-muted-foreground/40 font-mono">
                          No stocks — add tickers above
                        </td>
                      </tr>
                    ) : (
                      selected.symbols.map((sym, i) => {
                        const q = quotes[sym];
                        const up = q ? q.dp >= 0 : true;
                        const loaded = sym in quotes;
                        return (
                          <tr
                            key={sym}
                            className="border-b border-border/40 dark:border-slate-800/30 hover:bg-muted/50 dark:hover:bg-slate-800/25 transition-colors"
                          >
                            <td className="px-3 py-2 text-[10px] text-muted-foreground/40 font-mono">{i + 1}</td>
                            <td className="px-3 py-2">
                              <Link
                                href={`/chart?symbol=${sym}`}
                                className="font-mono font-bold text-xs text-primary hover:text-primary/80 transition-colors"
                              >
                                {sym}
                              </Link>
                            </td>
                            {!loaded ? (
                              <td colSpan={7} className="px-3 py-2">
                                <div className="h-3.5 rounded bg-muted dark:bg-slate-800/40 animate-pulse" />
                              </td>
                            ) : q ? (
                              <>
                                <td className="px-3 py-2 text-right font-mono text-xs font-bold text-foreground">
                                  ${fmtP(q.c)}
                                </td>
                                <td className={cn('px-3 py-2 text-right font-mono text-xs font-semibold', up ? 'dark:text-green-400 text-green-600' : 'dark:text-red-400 text-red-600')}>
                                  {up ? '+' : ''}{fmtP(q.d)}
                                </td>
                                <td className={cn('px-3 py-2 text-right font-mono text-xs font-semibold', up ? 'dark:text-green-400 text-green-600' : 'dark:text-red-400 text-red-600')}>
                                  {up ? '+' : ''}{fmtP(q.dp)}%
                                </td>
                                <td className="px-3 py-2 text-right font-mono text-xs text-muted-foreground hidden sm:table-cell">${fmtP(q.o)}</td>
                                <td className="px-3 py-2 text-right font-mono text-xs text-muted-foreground hidden md:table-cell">${fmtP(q.h)}</td>
                                <td className="px-3 py-2 text-right font-mono text-xs text-muted-foreground hidden md:table-cell">${fmtP(q.l)}</td>
                                <td className="px-3 py-2 text-right font-mono text-xs text-muted-foreground hidden lg:table-cell">${fmtP(q.pc)}</td>
                              </>
                            ) : (
                              <td colSpan={7} className="px-3 py-2 text-[10px] text-muted-foreground/40 font-mono text-right">
                                No data
                              </td>
                            )}
                            <td className="px-3 py-2 text-center">
                              <Link
                                href={`/chart?symbol=${sym}`}
                                className="text-muted-foreground/40 hover:text-sky-400 transition-colors"
                                title="Open chart"
                              >
                                <BarChart2 className="w-3.5 h-3.5 inline" />
                              </Link>
                            </td>
                            <td className="px-3 py-2 text-center">
                              <button
                                onClick={() => handleRemoveSymbol(sym)}
                                className="text-muted-foreground/40 hover:text-red-400 transition-colors"
                                title="Remove"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            /* No selection but watchlists exist - prompt to select */
            <div className="flex flex-col items-center justify-center flex-1 text-center px-4">
              <p className="text-sm text-muted-foreground mb-2">Enter tickers above to create a new watchlist</p>
              <p className="text-xs text-muted-foreground/50 font-mono">or select one from the sidebar</p>
            </div>
          )}

          <p className="shrink-0 text-center text-[10px] text-muted-foreground/20 font-mono py-3">
            ChartHog Watchlists · Saved locally · Data via Finnhub
          </p>
        </main>
      </div>
    </div>
  );
}
