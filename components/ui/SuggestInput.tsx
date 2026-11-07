import React, { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/** Bỏ dấu + thường hoá để so khớp "gong" ~ "Gọng" */
export const normalizeVi = (s: string) =>
  (s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();

export interface Suggestion<T = unknown> {
  key: string;
  /** Chuỗi dùng để so khớp với nội dung gõ */
  match: string;
  /** Dòng chính */
  label: string;
  /** Dòng phụ (mã, giá, chất liệu...) */
  detail?: string;
  data: T;
}

interface Props<T> {
  value: string;
  onChange: (v: string) => void;
  /** Chọn 1 gợi ý — thường dùng để điền luôn các ô liên quan */
  onPick: (s: Suggestion<T>) => void;
  suggestions: Suggestion<T>[];
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  maxItems?: number;
}

/**
 * Ô nhập có danh sách gợi ý xổ xuống (từ những gì đã từng nhập).
 * Gõ 1 ký tự trở lên là hiện; ↑ ↓ để chọn, Enter để điền, Esc để đóng.
 */
export function SuggestInput<T>({
  value, onChange, onPick, suggestions, className, placeholder, disabled, maxItems = 8,
}: Props<T>) {
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [pos, setPos] = useState<{ top: number; left: number; width: number; up: boolean } | null>(null);
  const listId = useId();

  const q = normalizeVi(value);
  const matches = useMemo(() => {
    if (!q) return [];
    const starts: Suggestion<T>[] = [];
    const contains: Suggestion<T>[] = [];
    for (const s of suggestions) {
      const m = normalizeVi(s.match);
      if (m === q) continue; // đã gõ đúng y hệt thì khỏi gợi ý
      if (m.startsWith(q) || m.split(/\s+/).some(w => w.startsWith(q))) starts.push(s);
      else if (m.includes(q)) contains.push(s);
    }
    return [...starts, ...contains].slice(0, maxItems);
  }, [q, suggestions, maxItems]);

  const show = open && !disabled && matches.length > 0;

  useEffect(() => { setActive(0); }, [q]);

  const place = () => {
    const el = inputRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const below = window.innerHeight - r.bottom;
    const up = below < 260 && r.top > below;
    setPos({ top: up ? r.top - 4 : r.bottom + 4, left: r.left, width: r.width, up });
  };

  useLayoutEffect(() => { if (show) place(); }, [show, matches.length]);

  useEffect(() => {
    if (!show) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (inputRef.current?.contains(t) || listRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [show]);

  useEffect(() => {
    if (!show) return;
    listRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active, show]);

  const pick = (s: Suggestion<T>) => {
    onPick(s);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!show) {
      if (e.key === 'ArrowDown' && matches.length) { setOpen(true); e.preventDefault(); }
      return;
    }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(i => (i + 1) % matches.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(i => (i - 1 + matches.length) % matches.length); }
    else if (e.key === 'Enter') { e.preventDefault(); pick(matches[active]); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setOpen(false); }
    else if (e.key === 'Tab') setOpen(false);
  };

  return (
    <>
      <input
        ref={inputRef}
        className={className}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={show}
        aria-controls={listId}
        aria-autocomplete="list"
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={onKeyDown}
      />
      {show && pos && createPortal(
        <div
          ref={listRef}
          id={listId}
          role="listbox"
          className="fixed z-[70] max-h-64 overflow-y-auto scroll-thin bg-white border border-slate-200 rounded-xl shadow-[0_12px_32px_rgba(15,23,42,0.14)] p-1 animate-modal-in no-print"
          style={{
            left: pos.left,
            width: Math.max(pos.width, 260),
            ...(pos.up ? { bottom: window.innerHeight - pos.top } : { top: pos.top }),
          }}
        >
          <p className="px-3 pt-1.5 pb-1 text-xs font-medium text-slate-400">Đã từng nhập</p>
          {matches.map((s, i) => (
            <div
              key={s.key}
              data-idx={i}
              role="option"
              aria-selected={i === active}
              onMouseDown={e => { e.preventDefault(); pick(s); }}
              onMouseEnter={() => setActive(i)}
              className={`px-3 py-2 rounded-lg cursor-pointer ${i === active ? 'bg-brand-50' : ''}`}
            >
              <div className={`text-sm font-medium truncate ${i === active ? 'text-brand-700' : 'text-slate-800'}`}>{s.label}</div>
              {s.detail && <div className="text-xs text-slate-500 truncate tabular-nums">{s.detail}</div>}
            </div>
          ))}
        </div>,
        document.body,
      )}
    </>
  );
}
