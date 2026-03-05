import React from 'react';
import { KeyValue } from '../types/messages';
import { X } from 'lucide-react';

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

  return (
    <div className="flex flex-col gap-1">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-1 group">
          <input
            type="checkbox"
            checked={item.enabled}
            onChange={(e) => update(i, 'enabled', e.target.checked)}
            className="shrink-0 accent-vsc-btn-bg"
          />
          <input
            className="input-field flex-1 text-[11px] py-1"
            placeholder={keyPlaceholder}
            value={item.key}
            onChange={(e) => update(i, 'key', e.target.value)}
          />
          <input
            className="input-field flex-1 text-[11px] py-1"
            placeholder={valuePlaceholder}
            value={item.value}
            onChange={(e) => update(i, 'value', e.target.value)}
          />
          <button
            onClick={() => remove(i)}
            className="shrink-0 p-1 rounded opacity-0 group-hover:opacity-50 hover:!opacity-100 transition-opacity"
            title="Remove"
          >
            <X size={12} />
          </button>
        </div>
      ))}
      <button
        onClick={() => onChange([...items, { key: '', value: '', enabled: true }])}
        className="btn-ghost self-start text-[11px] opacity-60"
      >
        + Add
      </button>
    </div>
  );
}
