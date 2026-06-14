'use client';

import { useState, useEffect, useRef, useCallback, KeyboardEvent } from 'react';
import { Search, X, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SearchResult } from '@/lib/types';

interface SymbolSearchProps {
  value: string;
  onSelect: (symbol: string, description: string) => void;
}

const TYPE_COLORS: Record<string, string> = {
  'Common Stock': 'text-sky-400',
  'ETP': 'text-purple-400',
  'ADR': 'text-amber-400',
};

export function SymbolSearch({ value, onSelect }: SymbolSearchProps) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep input in sync when parent changes symbol externally
  useEffect(() => {
    setQuery(value);
  }, [value]);

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 1) {
      setResults([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data: SearchResult[] = await res.json();
      setResults(Array.isArray(data) ? data : []);
      setOpen(true);
      setActiveIndex(-1);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(q), 280);
  };

  const handleSelect = (result: SearchResult) => {
    setQuery(result.displaySymbol);
    setOpen(false);
    setResults([]);
    onSelect(result.symbol, result.description);
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setOpen(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!open || !results.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      handleSelect(results[activeIndex]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const item = listRef.current.children[activeIndex] as HTMLElement;
      item?.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        inputRef.current &&
        !inputRef.current.closest('[data-symbol-search]')?.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div data-symbol-search className="relative w-64 sm:w-80">
      <div className="relative flex items-center">
        <Search className="absolute left-3 w-4 h-4 text-slate-500 pointer-events-none" />
        <input
          ref={inputRef}
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Search symbol…"
          autoComplete="off"
          spellCheck={false}
          className={cn(
            'w-full h-9 pl-9 pr-8 rounded-lg text-sm font-mono',
            'bg-slate-800/60 border border-slate-700/60',
            'text-slate-100 placeholder:text-slate-500',
            'focus:outline-none focus:ring-1 focus:ring-sky-500/60 focus:border-sky-500/60',
            'transition-all duration-150',
            loading && 'opacity-80'
          )}
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-2.5 text-slate-500 hover:text-slate-300 transition-colors"
            aria-label="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {open && results.length > 0 && (
        <div className="absolute z-50 mt-1.5 w-full rounded-xl border border-slate-700/60 bg-slate-900/95 backdrop-blur-md shadow-2xl shadow-black/50 overflow-hidden">
          <ul ref={listRef} role="listbox" className="max-h-72 overflow-y-auto py-1">
            {results.map((r, i) => (
              <li
                key={r.symbol}
                role="option"
                aria-selected={i === activeIndex}
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => handleSelect(r)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors',
                  i === activeIndex
                    ? 'bg-sky-500/10 text-sky-300'
                    : 'text-slate-300 hover:bg-slate-800/60'
                )}
              >
                <TrendingUp className="w-3.5 h-3.5 shrink-0 text-slate-500" />
                <span className="font-mono font-semibold text-sm tracking-wide">
                  {r.displaySymbol}
                </span>
                <span className="text-xs text-slate-500 truncate flex-1">
                  {r.description}
                </span>
                <span
                  className={cn(
                    'text-[10px] font-mono shrink-0',
                    TYPE_COLORS[r.type] ?? 'text-slate-500'
                  )}
                >
                  {r.type}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
