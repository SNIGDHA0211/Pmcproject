import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Building2, Check, ChevronDown, Loader2, MapPin, Search, X } from 'lucide-react';
import type { Project } from '../../types';

interface ExecutiveProjectPickerProps {
  id?: string;
  projects: Project[];
  selectedProjectId: string;
  onSelect: (id: string) => void;
  disabled?: boolean;
  isDark: boolean;
}

const cleanMeta = (value?: string | null): string => {
  const v = (value ?? '').trim();
  return v && v !== '—' && v.toLowerCase() !== 'n/a' ? v : '';
};

const initialsOf = (title: string): string => {
  const words = title
    .replace(/[^A-Za-z0-9 ]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return 'P';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
};

const ExecutiveProjectPicker: React.FC<ExecutiveProjectPickerProps> = ({
  id,
  projects,
  selectedProjectId,
  onSelect,
  disabled = false,
  isDark,
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [rect, setRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selected = projects.find((p) => p.id === selectedProjectId);
  const selectedIndex = projects.findIndex((p) => p.id === selectedProjectId);
  const selectedTitle = selected?.title?.trim() || 'Select project';
  const selectedMeta = [cleanMeta(selected?.client), cleanMeta(selected?.location)].filter(Boolean);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter((p) =>
      [p.title, p.client, p.location, p.teamLeadName]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [projects, query]);

  const measure = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setRect({ top: r.bottom + 8, left: r.left, width: Math.max(r.width, 320) });
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
  }, []);

  const openPicker = useCallback(() => {
    if (disabled) return;
    measure();
    setOpen(true);
    const idx = projects.findIndex((p) => p.id === selectedProjectId);
    setActiveIndex(idx >= 0 ? idx : 0);
  }, [disabled, measure, projects, selectedProjectId]);

  const choose = useCallback(
    (projectId: string) => {
      close();
      if (projectId !== selectedProjectId) onSelect(projectId);
      triggerRef.current?.focus();
    },
    [close, onSelect, selectedProjectId],
  );

  useLayoutEffect(() => {
    if (!open) return;
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [open, measure]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => searchRef.current?.focus(), 30);
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node;
      if (panelRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      close();
    };
    document.addEventListener('mousedown', onDoc);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener('mousedown', onDoc);
    };
  }, [open, close]);

  useEffect(() => {
    if (disabled && open) close();
  }, [disabled, open, close]);

  useEffect(() => {
    if (!open) return;
    setActiveIndex((i) => Math.min(Math.max(0, i), Math.max(0, filtered.length - 1)));
  }, [filtered.length, open]);

  useEffect(() => {
    if (!open) return;
    const item = listRef.current?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`);
    item?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, open]);

  const onPanelKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
      triggerRef.current?.focus();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(filtered.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = filtered[activeIndex];
      if (target) choose(target.id);
    }
  };

  const listboxId = `${id ?? 'pmc-exec-project'}-listbox`;

  return (
    <>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        title={selectedTitle}
        onClick={() => (open ? close() : openPicker())}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            openPicker();
          }
        }}
        className={`pmc-xp-trigger group ${isDark ? 'is-dark' : 'is-light'}${open ? ' is-open' : ''}`}
      >
        <span className="pmc-xp-avatar" aria-hidden>
          {disabled ? <Loader2 size={16} className="animate-spin" /> : initialsOf(selectedTitle)}
        </span>
        <span className="min-w-0 flex-1 text-left">
          <span className="pmc-xp-title block truncate">{selectedTitle}</span>
          <span className="pmc-xp-meta flex min-w-0 items-center gap-1.5 truncate">
            {selectedMeta.length > 0 ? (
              <>
                <MapPin size={11} className="shrink-0 opacity-70" />
                <span className="truncate">{selectedMeta.join(' · ')}</span>
              </>
            ) : (
              <span className="truncate">Switch project to review another site</span>
            )}
          </span>
        </span>
        {projects.length > 0 && selectedIndex >= 0 && (
          <span className="pmc-xp-count hidden sm:inline-flex" aria-hidden>
            {selectedIndex + 1}/{projects.length}
          </span>
        )}
        <ChevronDown size={16} className="pmc-xp-chevron shrink-0" aria-hidden />
      </button>

      {open &&
        rect &&
        createPortal(
          <div
            ref={panelRef}
            className={`pmc-xp-panel ${isDark ? 'is-dark' : 'is-light'}`}
            style={{ top: rect.top, left: rect.left, width: rect.width }}
            onKeyDown={onPanelKeyDown}
          >
            <div className="pmc-xp-search">
              <Search size={14} className="shrink-0 opacity-70" aria-hidden />
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActiveIndex(0);
                }}
                placeholder="Search by project, client, location…"
                aria-label="Search projects"
                aria-controls={listboxId}
                aria-activedescendant={
                  filtered[activeIndex] ? `${listboxId}-${filtered[activeIndex].id}` : undefined
                }
              />
              {query && (
                <button type="button" onClick={() => setQuery('')} aria-label="Clear search" className="pmc-xp-clear">
                  <X size={12} />
                </button>
              )}
              <span className="pmc-xp-total">
                {filtered.length}/{projects.length}
              </span>
            </div>

            <ul ref={listRef} id={listboxId} role="listbox" aria-label="Projects" className="pmc-xp-list">
              {filtered.length === 0 ? (
                <li className="pmc-xp-empty">
                  <Building2 size={18} />
                  No projects match &ldquo;{query.trim()}&rdquo;
                </li>
              ) : (
                filtered.map((p, index) => {
                  const isSelected = p.id === selectedProjectId;
                  const isActive = index === activeIndex;
                  const meta = [cleanMeta(p.client), cleanMeta(p.location)].filter(Boolean).join(' · ');
                  return (
                    <li
                      key={p.id}
                      id={`${listboxId}-${p.id}`}
                      role="option"
                      aria-selected={isSelected}
                      data-index={index}
                      className={`pmc-xp-option${isActive ? ' is-active' : ''}${isSelected ? ' is-selected' : ''}`}
                      style={{ '--xp-delay': `${Math.min(index, 10) * 22}ms` } as React.CSSProperties}
                      onMouseEnter={() => setActiveIndex(index)}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => choose(p.id)}
                    >
                      <span className="pmc-xp-option-avatar" aria-hidden>
                        {initialsOf(p.title)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="pmc-xp-option-title block truncate">{p.title}</span>
                        {meta && <span className="pmc-xp-option-meta block truncate">{meta}</span>}
                      </span>
                      {isSelected && <Check size={15} className="pmc-xp-check shrink-0" aria-hidden />}
                    </li>
                  );
                })
              )}
            </ul>

            <div className="pmc-xp-foot">
              <span>
                <kbd>↑</kbd>
                <kbd>↓</kbd> navigate
              </span>
              <span>
                <kbd>Enter</kbd> open
              </span>
              <span>
                <kbd>Esc</kbd> close
              </span>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
};

export default ExecutiveProjectPicker;
