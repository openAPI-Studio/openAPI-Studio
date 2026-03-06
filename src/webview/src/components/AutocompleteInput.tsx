import React, { useState, useRef, useEffect } from 'react';

interface Props {
  value: string;
  onChange: (v: string) => void;
  suggestions: string[];
  placeholder?: string;
  className?: string;
}

export function AutocompleteInput({ value, onChange, suggestions, placeholder, className }: Props) {
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = value
    ? suggestions.filter((s) => s.toLowerCase().includes(value.toLowerCase()) && s.toLowerCase() !== value.toLowerCase())
    : suggestions;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative flex-1">
      <input
        ref={inputRef}
        className={className || 'input-line w-full text-[12px]'}
        placeholder={placeholder}
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => { setFocused(true); setOpen(true); }}
        onBlur={() => setFocused(false)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setOpen(false);
          if (e.key === 'ArrowDown' && !open) setOpen(true);
        }}
      />
      {open && focused && filtered.length > 0 && (
        <div
          className="absolute left-0 right-0 top-full mt-0.5 z-50 rounded shadow-vsc max-h-40 overflow-auto py-0.5"
          style={{ background: 'var(--vsc-dropdown-bg)', border: '1px solid var(--vsc-dropdown-border)' }}
        >
          {filtered.slice(0, 15).map((s) => (
            <button
              key={s}
              className="w-full text-left px-2 py-1 text-[11px] transition-colors hover:bg-vsc-list-hover truncate"
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(s);
                setOpen(false);
                inputRef.current?.focus();
              }}
            >
              {value ? highlightMatch(s, value) : s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function highlightMatch(text: string, query: string) {
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <span style={{ color: 'var(--vsc-link)' }}>{text.slice(idx, idx + query.length)}</span>
      {text.slice(idx + query.length)}
    </>
  );
}
