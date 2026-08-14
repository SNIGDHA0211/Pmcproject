import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Icons } from './Icons';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { getThemeClasses } from '../utils/theme';
import {
  HEADER_SEARCH_META,
  HEADER_SEARCH_SECTION_LABEL,
  scoreHeaderSearchHit,
} from '../utils/headerSearchCatalog';
import type { HeaderSearchJump } from '../utils/headerSearchDeepLinks';

export type HeaderSearchNavItem = {
  id: string;
  label: string;
  section: string;
  icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
  hint?: string;
  keywords?: string[];
  jump?: HeaderSearchJump;
};

type HeaderSearchProps = {
  items: HeaderSearchNavItem[];
  isDarkTheme: boolean;
  onNavigate: (item: HeaderSearchNavItem) => void;
  onOpen?: () => void;
  notificationsOpen?: boolean;
};

const DEBOUNCE_MS = 280;

export default function HeaderSearch({
  items,
  isDarkTheme,
  onNavigate,
  onOpen,
  notificationsOpen = false,
}: HeaderSearchProps) {
  const tc = getThemeClasses(isDarkTheme);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const debouncedQuery = useDebouncedValue(query, DEBOUNCE_MS);
  const isTyping = query.trim() !== debouncedQuery.trim();

  const results = useMemo(() => {
    const q = debouncedQuery.trim();
    if (!q) {
      return items.map((item) => ({ item, score: 1 }));
    }
    return items
      .map((item) => ({ item, score: scoreHeaderSearchHit(q, item) }))
      .filter((row) => row.score > 0)
      .sort((a, b) => b.score - a.score || a.item.label.localeCompare(b.item.label))
      .slice(0, 16);
  }, [debouncedQuery, items]);

  const grouped = useMemo(() => {
    const map = new Map<string, HeaderSearchNavItem[]>();
    results.forEach(({ item }) => {
      const key = HEADER_SEARCH_SECTION_LABEL[item.section] ?? item.section;
      const list = map.get(key) ?? [];
      list.push(item);
      map.set(key, list);
    });
    return [...map.entries()];
  }, [results]);

  const flat = useMemo(
    () => grouped.flatMap(([, sectionItems]) => sectionItems),
    [grouped],
  );

  const close = useCallback(() => {
    setOpen(false);
    setActiveIndex(0);
  }, []);

  const goTo = useCallback(
    (item: HeaderSearchNavItem) => {
      onNavigate(item);
      setQuery('');
      close();
    },
    [close, onNavigate],
  );

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) close();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
        inputRef.current?.blur();
      }
    };
    document.addEventListener('mousedown', onPointer);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      window.removeEventListener('keydown', onKey);
    };
  }, [close, open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [debouncedQuery]);

  useEffect(() => {
    if (notificationsOpen) close();
  }, [close, notificationsOpen]);

  useEffect(() => {
    const onSlash = (event: KeyboardEvent) => {
      if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable) return;
      event.preventDefault();
      setOpen(true);
      onOpen?.();
      inputRef.current?.focus();
    };
    window.addEventListener('keydown', onSlash);
    return () => window.removeEventListener('keydown', onSlash);
  }, [onOpen]);

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open && (event.key === 'ArrowDown' || event.key === 'Enter')) {
      setOpen(true);
      onOpen?.();
      return;
    }
    if (!open) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, Math.max(0, flat.length - 1)));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const target = flat[activeIndex];
      if (target) goTo(target);
    }
  };

  const showPanel = open && (query.trim().length > 0 || items.length > 0);
  const empty = Boolean(debouncedQuery.trim()) && !isTyping && results.length === 0;

  return (
    <div ref={rootRef} className="relative min-w-0 flex-1 max-w-xl">
      <label htmlFor="pmc-header-search" className="sr-only">
        Search sections
      </label>
      <div
        className={`flex h-9 items-center gap-2 rounded-xl border px-3 transition-shadow ${
          isDarkTheme
            ? 'border-white/12 bg-white/[0.06] focus-within:border-amber-400/50 focus-within:bg-white/[0.09] focus-within:shadow-[0_0_0_3px_rgba(230,138,0,0.16)]'
            : 'border-[#b8cfe0] bg-white/90 focus-within:border-amber-400 focus-within:shadow-[0_0_0_3px_rgba(230,138,0,0.14)]'
        }`}
      >
        <Icons.Search
          size={16}
          className={`shrink-0 ${isDarkTheme ? 'text-amber-300/80' : 'text-amber-600'}`}
        />
        <input
          id="pmc-header-search"
          ref={inputRef}
          type="search"
          autoComplete="off"
          spellCheck={false}
          placeholder="Search drawings, DPR, finance…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!open) {
              setOpen(true);
              onOpen?.();
            }
          }}
          onFocus={() => {
            setOpen(true);
            onOpen?.();
          }}
          onKeyDown={onKeyDown}
          className={`min-w-0 flex-1 bg-transparent text-[0.9375rem] font-semibold outline-none placeholder:font-medium [&::-webkit-search-cancel-button]:hidden ${
            isDarkTheme
              ? 'text-white placeholder:text-white/40'
              : 'text-[#1a2332] placeholder:text-slate-400'
          }`}
        />
        {isTyping && (
          <span
            className={`h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-t-transparent ${
              isDarkTheme ? 'border-amber-300/70' : 'border-amber-500/70'
            }`}
            aria-hidden
          />
        )}
        {query && !isTyping && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              inputRef.current?.focus();
            }}
            className={`rounded-md p-0.5 ${tc.buttonSecondary}`}
            aria-label="Clear search"
          >
            <Icons.Close size={14} />
          </button>
        )}
        <kbd
          className={`hidden shrink-0 rounded-md border px-1.5 py-0.5 font-mono text-[10px] font-semibold sm:inline ${
            isDarkTheme ? 'border-white/15 text-white/45' : 'border-slate-200 text-slate-400'
          }`}
        >
          /
        </kbd>
      </div>

      {showPanel && (
        <div
          className={`absolute left-0 right-0 top-[calc(100%+0.45rem)] z-[120] overflow-hidden rounded-2xl border backdrop-blur-xl shadow-2xl ${
            isDarkTheme
              ? 'border-white/12 bg-[#121a24]/95 text-white shadow-[0_18px_48px_rgba(0,0,0,0.5)]'
              : 'border-slate-200 bg-white/95 text-slate-900 shadow-[0_18px_40px_rgba(15,23,42,0.14)]'
          }`}
          role="listbox"
          aria-label="Search results"
        >
          <div
            className={`flex items-center justify-between border-b px-4 py-2.5 ${
              isDarkTheme ? 'border-white/10' : 'border-slate-100'
            }`}
          >
            <p className="pmc-type-eyebrow" style={{ color: isDarkTheme ? '#ffb366' : '#e68a00' }}>
              {debouncedQuery.trim() ? 'Matching sections' : 'Quick jump'}
            </p>
            <span className={`pmc-type-caption ${tc.textMuted}`}>
              {empty ? '0' : results.length} {results.length === 1 ? 'result' : 'results'}
            </span>
          </div>

          <div className="max-h-[min(28rem,70vh)] overflow-y-auto p-2.5">
            {empty ? (
              <div className="px-3 py-8 text-center">
                <p className="pmc-type-card-title">No matching section</p>
                <p className={`mt-1 pmc-type-helper ${tc.textMuted}`}>
                  Try “drawing”, “DPR”, “photos”, or “finance”.
                </p>
              </div>
            ) : (
              grouped.map(([section, sectionItems]) => (
                <div key={section} className="mb-2 last:mb-0">
                  <p className={`px-2 pb-1.5 pt-1 pmc-type-caption uppercase ${tc.textMuted}`}>
                    {section}
                  </p>
                  <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                    {sectionItems.map((item) => {
                      const flatIndex = flat.findIndex((row) => row.id === item.id);
                      const active = flatIndex === activeIndex;
                      const Icon = item.icon;
                      const hint =
                        item.hint ?? HEADER_SEARCH_META[item.id]?.hint ?? 'Open this workspace section';
                      return (
                        <button
                          key={item.id}
                          type="button"
                          role="option"
                          aria-selected={active}
                          onMouseEnter={() => setActiveIndex(Math.max(0, flatIndex))}
                          onClick={() => goTo(item)}
                          className={`pmc-header-search-hit flex min-h-[4.5rem] items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
                            active
                              ? isDarkTheme
                                ? 'border-amber-400/45 bg-amber-500/12 shadow-[0_0_0_1px_rgba(245,158,11,0.2)]'
                                : 'border-amber-300 bg-amber-50 shadow-[0_0_0_1px_rgba(230,138,0,0.12)]'
                              : isDarkTheme
                                ? 'border-white/8 bg-white/[0.03] hover:border-white/16 hover:bg-white/[0.06]'
                                : 'border-slate-100 bg-slate-50/80 hover:border-slate-200 hover:bg-white'
                          }`}
                        >
                          <span
                            className={`mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                              active
                                ? isDarkTheme
                                  ? 'bg-amber-500/20 text-amber-200'
                                  : 'bg-amber-100 text-amber-700'
                                : isDarkTheme
                                  ? 'bg-white/8 text-cyan-200'
                                  : 'bg-white text-slate-600 shadow-sm'
                            }`}
                          >
                            <Icon size={16} strokeWidth={2.1} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-2">
                              <span className="pmc-type-card-title truncate text-[0.95rem]">
                                {item.label}
                              </span>
                              {active && (
                                <Icons.ChevronRight
                                  size={14}
                                  className={`shrink-0 ${isDarkTheme ? 'text-amber-300' : 'text-amber-600'}`}
                                />
                              )}
                            </span>
                            <span className={`mt-0.5 block line-clamp-2 pmc-type-helper ${tc.textMuted}`}>
                              {hint}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>

          <div
            className={`flex items-center justify-between border-t px-4 py-2 ${
              isDarkTheme ? 'border-white/10 bg-black/20' : 'border-slate-100 bg-slate-50'
            }`}
          >
            <p className={`pmc-type-helper ${tc.textMuted}`}>
              Enter to open · Esc to close
            </p>
            <p className={`hidden pmc-type-helper sm:block ${tc.textMuted}`}>
              Only sections you can access
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
