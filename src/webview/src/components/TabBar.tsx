import React from 'react';
import { useTabStore } from '../stores/tabStore';
import { X, Plus } from 'lucide-react';

const methodColor: Record<string, string> = {
  GET: '#61affe', POST: '#49cc90', PUT: '#fca130', PATCH: '#50e3c2', DELETE: '#f93e3e', HEAD: '#9012fe', OPTIONS: '#0d5aa7',
};

export function TabBar() {
  const tabs = useTabStore((s) => s.tabs);
  const activeTabId = useTabStore((s) => s.activeTabId);
  const setActiveTab = useTabStore((s) => s.setActiveTab);
  const closeTab = useTabStore((s) => s.closeTab);
  const addTab = useTabStore((s) => s.addTab);

  return (
    <div className="flex items-center shrink-0 overflow-x-auto" style={{ borderBottom: '1px solid var(--vsc-border-visible)', background: 'var(--vsc-tab-inactive)' }}>
      {tabs.map((tab) => {
        const active = tab.id === activeTabId;
        return (
          <div
            key={tab.id}
            className={`group flex items-center gap-1.5 px-3 py-1.5 text-[11px] cursor-pointer shrink-0 border-r transition-colors ${active ? 'opacity-100' : 'opacity-50 hover:opacity-75'}`}
            style={{
              background: active ? 'var(--vsc-bg)' : 'transparent',
              borderColor: 'var(--vsc-border-visible)',
              borderBottom: active ? '2px solid var(--vsc-btn-bg)' : '2px solid transparent',
              marginBottom: '-1px',
            }}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="font-mono text-[9px] font-bold uppercase" style={{ color: methodColor[tab.method] || 'var(--vsc-fg)' }}>
              {tab.method}
            </span>
            <span className="truncate max-w-[120px]">{tab.name || tab.url || 'New Request'}</span>
            {tab.loading && <span className="w-2 h-2 rounded-full animate-pulse shrink-0" style={{ background: 'var(--vsc-warning)' }} />}
            <button
              className="opacity-0 group-hover:opacity-50 hover:!opacity-100 shrink-0 p-0.5 rounded transition-opacity"
              onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }}
              title="Close tab"
            >
              <X size={10} />
            </button>
          </div>
        );
      })}
      <button
        className="shrink-0 p-1.5 opacity-30 hover:opacity-70 transition-opacity"
        onClick={addTab}
        title="New tab"
      >
        <Plus size={12} />
      </button>
    </div>
  );
}
