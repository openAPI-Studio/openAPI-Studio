import React from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';

interface JsonTreeProps {
  data: unknown;
  level?: number;
}

export function JsonTreeView({ data, level = 0 }: JsonTreeProps) {
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});
  const toggle = (key: string) => setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));

  if (data === null) return <span style={{ color: '#569cd6' }}>null</span>;
  if (typeof data === 'boolean') return <span style={{ color: '#569cd6' }}>{String(data)}</span>;
  if (typeof data === 'number') return <span style={{ color: '#b5cea8' }}>{data}</span>;
  if (typeof data === 'string') return <span style={{ color: '#ce9178' }}>"{data}"</span>;

  if (Array.isArray(data)) {
    if (data.length === 0) return <span className="opacity-50">[]</span>;
    return (
      <div style={{ paddingLeft: level > 0 ? 14 : 0 }}>
        <span className="cursor-pointer inline-flex items-center gap-0.5 opacity-60 hover:opacity-100 transition-opacity" onClick={() => toggle('arr')}>
          {collapsed['arr'] ? <ChevronRight size={11} /> : <ChevronDown size={11} />}
          <span className="opacity-50">[{data.length}]</span>
        </span>
        {!collapsed['arr'] && data.map((item, i) => (
          <div key={i} style={{ paddingLeft: 14 }}>
            <span className="opacity-30">{i}: </span>
            <JsonTreeView data={item} level={level + 1} />
          </div>
        ))}
      </div>
    );
  }

  if (typeof data === 'object') {
    const entries = Object.entries(data as Record<string, unknown>);
    if (entries.length === 0) return <span className="opacity-50">{'{}'}</span>;
    return (
      <div style={{ paddingLeft: level > 0 ? 14 : 0 }}>
        {entries.map(([key, val]) => {
          const isExpandable = typeof val === 'object' && val !== null;
          return (
            <div key={key}>
              {isExpandable ? (
                <>
                  <span className="cursor-pointer inline-flex items-center gap-0.5 opacity-60 hover:opacity-100 transition-opacity" onClick={() => toggle(key)}>
                    {collapsed[key] ? <ChevronRight size={11} /> : <ChevronDown size={11} />}
                  </span>
                  <span style={{ color: '#9cdcfe' }}>{key}</span>:{' '}
                  {collapsed[key] ? (
                    <span className="opacity-30">{Array.isArray(val) ? `[${val.length}]` : '{...}'}</span>
                  ) : (
                    <JsonTreeView data={val} level={level + 1} />
                  )}
                </>
              ) : (
                <span style={{ marginLeft: 16 }}>
                  <span style={{ color: '#9cdcfe' }}>{key}</span>: <JsonTreeView data={val} level={level + 1} />
                </span>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return <span>{String(data)}</span>;
}
