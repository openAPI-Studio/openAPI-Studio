import React from 'react';
import { KeyValue } from '../types/messages';

interface Props {
  items: KeyValue[];
  onChange: (items: KeyValue[]) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
}

export function KeyValueEditor({ items, onChange, keyPlaceholder = 'Key', valuePlaceholder = 'Value' }: Props) {
  const update = (index: number, field: keyof KeyValue, value: string | boolean) => {
    const next = items.map((item, i) => i === index ? { ...item, [field]: value } : item);
    onChange(next);
  };

  const remove = (index: number) => {
    const next = items.filter((_, i) => i !== index);
    if (next.length === 0) next.push({ key: '', value: '', enabled: true });
    onChange(next);
  };

  const addRow = () => onChange([...items, { key: '', value: '', enabled: true }]);

  return (
    <div className="flex flex-col gap-1">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={item.enabled}
            onChange={(e) => update(i, 'enabled', e.target.checked)}
            className="shrink-0"
          />
          <input
            className="flex-1 px-2 py-1 rounded text-sm"
            style={{ background: 'var(--input-bg)', color: 'var(--input-fg)', border: '1px solid var(--input-border)' }}
            placeholder={keyPlaceholder}
            value={item.key}
            onChange={(e) => update(i, 'key', e.target.value)}
          />
          <input
            className="flex-1 px-2 py-1 rounded text-sm"
            style={{ background: 'var(--input-bg)', color: 'var(--input-fg)', border: '1px solid var(--input-border)' }}
            placeholder={valuePlaceholder}
            value={item.value}
            onChange={(e) => update(i, 'value', e.target.value)}
          />
          <button
            onClick={() => remove(i)}
            className="shrink-0 px-2 py-1 rounded text-sm opacity-60 hover:opacity-100"
            title="Remove"
          >
            ✕
          </button>
        </div>
      ))}
      <button
        onClick={addRow}
        className="self-start px-2 py-1 text-xs rounded opacity-70 hover:opacity-100"
        style={{ background: 'var(--input-bg)' }}
      >
        + Add
      </button>
    </div>
  );
}
