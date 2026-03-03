import React from 'react';

interface JsonTreeProps {
  data: unknown;
  level?: number;
}

export function JsonTreeView({ data, level = 0 }: JsonTreeProps) {
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});

  const toggle = (key: string) => {
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (data === null) return <span className="opacity-50">null</span>;
  if (typeof data === 'boolean') return <span style={{ color: 'var(--warning)' }}>{String(data)}</span>;
  if (typeof data === 'number') return <span style={{ color: 'var(--success)' }}>{data}</span>;
  if (typeof data === 'string') return <span style={{ color: 'var(--error)' }}>"{data}"</span>;

  if (Array.isArray(data)) {
    if (data.length === 0) return <span>[]</span>;
    return (
      <div style={{ paddingLeft: level > 0 ? 16 : 0 }}>
        <span className="cursor-pointer opacity-70" onClick={() => toggle('arr')}>
          {collapsed['arr'] ? '▶' : '▼'} [{data.length}]
        </span>
        {!collapsed['arr'] && data.map((item, i) => (
          <div key={i} style={{ paddingLeft: 16 }}>
            <span className="opacity-50">{i}: </span>
            <JsonTreeView data={item} level={level + 1} />
          </div>
        ))}
      </div>
    );
  }

  if (typeof data === 'object') {
    const entries = Object.entries(data as Record<string, unknown>);
    if (entries.length === 0) return <span>{'{}'}</span>;
    return (
      <div style={{ paddingLeft: level > 0 ? 16 : 0 }}>
        {entries.map(([key, val]) => {
          const isExpandable = typeof val === 'object' && val !== null;
          return (
            <div key={key}>
              {isExpandable ? (
                <>
                  <span className="cursor-pointer opacity-70" onClick={() => toggle(key)}>
                    {collapsed[key] ? '▶' : '▼'}
                  </span>{' '}
                  <span style={{ color: '#9cdcfe' }}>{key}</span>:{' '}
                  {collapsed[key] ? (
                    <span className="opacity-50">{Array.isArray(val) ? `[${val.length}]` : '{...}'}</span>
                  ) : (
                    <JsonTreeView data={val} level={level + 1} />
                  )}
                </>
              ) : (
                <>
                  <span className="opacity-30 ml-3">  </span>
                  <span style={{ color: '#9cdcfe' }}>{key}</span>: <JsonTreeView data={val} level={level + 1} />
                </>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return <span>{String(data)}</span>;
}
