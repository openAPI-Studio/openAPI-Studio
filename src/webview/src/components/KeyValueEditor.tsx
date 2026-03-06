import React from 'react';
import { KeyValue } from '../types/messages';
import { X } from 'lucide-react';
import { AutocompleteInput } from './AutocompleteInput';

interface Props {
  items: KeyValue[];
  onChange: (items: KeyValue[]) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
  keySuggestions?: string[];
  valueSuggestionsMap?: Record<string, string[]>;
}

export function KeyValueEditor({ items, onChange, keyPlaceholder = 'Key', valuePlaceholder = 'Value', keySuggestions, valueSuggestionsMap }: Props) {
  const update = (index: number, field: keyof KeyValue, value: string | boolean) => {
    const next = items.map((item, i) => i === index ? { ...item, [field]: value } : item);
    onChange(next);
  };

  const remove = (index: number) => {
    const next = items.filter((_, i) => i !== index);
    if (next.length === 0) next.push({ key: '', value: '', enabled: true });
    onChange(next);
  };

  return (
    <div className="flex flex-col">
      {/* Column headers */}
      <div className="flex items-center gap-2 px-1 pb-1" style={{ borderBottom: '1px solid var(--vsc-border-visible)' }}>
        <span className="w-5 shrink-0" />
        <span className="flex-1 text-[10px] uppercase tracking-wider opacity-30 font-medium">{keyPlaceholder}</span>
        <span className="flex-1 text-[10px] uppercase tracking-wider opacity-30 font-medium">{valuePlaceholder}</span>
        <span className="w-6 shrink-0" />
      </div>
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2 group min-w-0" style={{ borderBottom: '1px solid var(--vsc-border-visible)' }}>
          <input
            type="checkbox"
            checked={item.enabled}
            onChange={(e) => update(i, 'enabled', e.target.checked)}
            className="shrink-0 accent-vsc-btn-bg"
            style={{ width: 14, height: 14 }}
          />
          {keySuggestions ? (
            <AutocompleteInput
              value={item.key}
              onChange={(v) => update(i, 'key', v)}
              suggestions={keySuggestions}
              placeholder={keyPlaceholder}
              className="input-line flex-1 min-w-0 text-[12px]"
            />
          ) : (
            <input
              className="input-line flex-1 min-w-0 text-[12px]"
              placeholder={keyPlaceholder}
              value={item.key}
              onChange={(e) => update(i, 'key', e.target.value)}
              style={{ borderBottom: 'none' }}
            />
          )}
          <div className="w-px self-stretch opacity-10" style={{ background: 'var(--vsc-fg)' }} />
          {valueSuggestionsMap ? (
            <AutocompleteInput
              value={item.value}
              onChange={(v) => update(i, 'value', v)}
              suggestions={valueSuggestionsMap[item.key] || []}
              placeholder={valuePlaceholder}
              className="input-line flex-1 min-w-0 text-[12px]"
            />
          ) : (
            <input
              className="input-line flex-1 min-w-0 text-[12px]"
              placeholder={valuePlaceholder}
              value={item.value}
              onChange={(e) => update(i, 'value', e.target.value)}
              style={{ borderBottom: 'none' }}
            />
          )}
          <button
            onClick={() => remove(i)}
            className="shrink-0 p-1 rounded opacity-0 group-hover:opacity-40 hover:!opacity-100 transition-opacity"
            title="Remove"
          >
            <X size={13} />
          </button>
        </div>
      ))}
      <button
        onClick={() => onChange([...items, { key: '', value: '', enabled: true }])}
        className="btn-ghost self-start text-[11px] opacity-50 mt-1"
      >
        + Add
      </button>
    </div>
  );
}
