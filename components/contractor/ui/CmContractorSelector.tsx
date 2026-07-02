import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search } from 'lucide-react';
import type { ContractorMasterRecord } from '../../../types/contractorManagement';
import { useCmTheme } from '../enterpriseTheme';

export interface CmContractorSelectorProps {
  contractors: ContractorMasterRecord[];
  value: number | null;
  onChange: (id: number) => void;
  className?: string;
}

const CmContractorSelector: React.FC<CmContractorSelectorProps> = ({
  contractors,
  value,
  onChange,
  className = '',
}) => {
  const theme = useCmTheme();
  const listId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const selectedOptionRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [menuRect, setMenuRect] = useState<{ top: number; left: number; width: number } | null>(null);

  const active = useMemo(
    () => contractors.filter((c) => c.status === 'ACTIVE'),
    [contractors],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return active;
    return active.filter((c) => c.contractor_name.toLowerCase().includes(q));
  }, [active, query]);

  const selected = active.find((c) => c.id === value);
  const showSearch = active.length >= 3;

  const updateMenuPosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    setMenuRect({
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
    });
  }, []);

  const closeMenu = useCallback(() => {
    setOpen(false);
    setQuery('');
  }, []);

  useEffect(() => {
    if (!open) {
      setMenuRect(null);
      return;
    }

    updateMenuPosition();

    const onScrollOrResize = () => updateMenuPosition();
    window.addEventListener('resize', onScrollOrResize);
    window.addEventListener('scroll', onScrollOrResize, true);

    return () => {
      window.removeEventListener('resize', onScrollOrResize);
      window.removeEventListener('scroll', onScrollOrResize, true);
    };
  }, [open, updateMenuPosition]);

  useEffect(() => {
    if (!open) return;

    const onDocMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      closeMenu();
    };

    const onEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMenu();
    };

    document.addEventListener('mousedown', onDocMouseDown);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown);
      document.removeEventListener('keydown', onEscape);
    };
  }, [open, closeMenu]);

  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => {
      selectedOptionRef.current?.scrollIntoView({ block: 'nearest' });
    });
  }, [open, value, filtered]);

  const handleSelect = (id: number) => {
    onChange(id);
    closeMenu();
    triggerRef.current?.focus();
  };

  const menu =
    open && menuRect
      ? createPortal(
          <div
            ref={menuRef}
            id={`${listId}-listbox`}
            role="listbox"
            aria-label="Contractor list"
            style={{
              position: 'fixed',
              top: menuRect.top,
              left: menuRect.left,
              width: menuRect.width,
              zIndex: 9999,
            }}
            className={`${theme.select.dropdown} animate-in fade-in slide-in-from-top-1 duration-150`}
          >
            {showSearch && (
              <div className={`relative shrink-0 ${theme.isDark ? 'border-b border-white/10' : 'border-b border-slate-100'}`}>
                <Search
                  size={14}
                  className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 ${theme.tc.textMuted}`}
                  aria-hidden
                />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search contractors…"
                  className={`${theme.select.search} pl-9`}
                  aria-label="Search contractors"
                  autoFocus
                />
              </div>
            )}
            <div className={theme.select.list}>
              {filtered.length === 0 ? (
                <p className={`px-3 py-3 text-sm ${theme.tc.textMuted}`}>No contractors found</p>
              ) : (
                filtered.map((c) => {
                  const idx = active.indexOf(c) + 1;
                  const isSelected = c.id === value;
                  return (
                    <div
                      key={c.id}
                      ref={isSelected ? selectedOptionRef : undefined}
                      role="option"
                      aria-selected={isSelected}
                      tabIndex={0}
                      onClick={() => handleSelect(c.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleSelect(c.id);
                        }
                      }}
                      className={`${theme.select.option} ${isSelected ? theme.select.optionActive : ''}`}
                    >
                      {idx}. {c.contractor_name}
                    </div>
                  );
                })
              )}
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className={`w-full ${className}`}>
      <label htmlFor={`${listId}-trigger`} className={theme.select.label}>
        Contractor
      </label>
      <button
        ref={triggerRef}
        id={`${listId}-trigger`}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${listId}-listbox`}
        onClick={() => {
          if (open) {
            closeMenu();
          } else {
            setOpen(true);
          }
        }}
        className={`${theme.select.input} flex w-full items-center justify-between gap-2 text-left ${
          open
            ? theme.isDark
              ? 'border-indigo-500/50 ring-2 ring-indigo-500/25'
              : 'border-indigo-400 ring-2 ring-indigo-500/20'
            : ''
        }`}
      >
        <span className="truncate">
          {selected ? `${active.indexOf(selected) + 1}. ${selected.contractor_name}` : 'Select contractor'}
        </span>
        <ChevronDown
          size={16}
          className={`shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''} ${theme.tc.textMuted}`}
          aria-hidden
        />
      </button>
      {menu}
    </div>
  );
};

export default CmContractorSelector;
