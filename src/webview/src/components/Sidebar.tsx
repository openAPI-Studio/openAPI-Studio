import React from 'react';
import { useAppStore } from '../stores/appStore';
import { useRequestStore } from '../stores/requestStore';
import { postMessage, Environment, KeyValue } from '../types/messages';
import { KeyValueEditor } from './KeyValueEditor';
import { X, PanelLeftClose, PanelLeftOpen, Search, FolderOpen, Globe, Clock } from 'lucide-react';

const tabIcons = { collections: FolderOpen, environments: Globe, history: Clock } as const;

export function Sidebar() {
  const sidebarTab = useAppStore((s) => s.sidebarTab);
  const setSidebarTab = useAppStore((s) => s.setSidebarTab);
  const collapsed = useAppStore((s) => s.sidebarCollapsed);
  const setCollapsed = useAppStore((s) => s.setSidebarCollapsed);
  const search = useAppStore((s) => s.sidebarSearch);
  const setSearch = useAppStore((s) => s.setSidebarSearch);
  const collections = useAppStore((s) => s.collections);
  const environments = useAppStore((s) => s.environments);
  const history = useAppStore((s) => s.history);
  const loadRequest = useRequestStore((s) => s.loadRequest);
  const addToast = useAppStore((s) => s.addToast);
  const showConfirm = useAppStore((s) => s.showConfirm);

  const [editingEnv, setEditingEnv] = React.useState<Environment | null>(null);
  const [newName, setNewName] = React.useState('');

  const q = search.toLowerCase();
  const filteredCollections = collections.filter((c) => c.name.toLowerCase().includes(q) || c.requests.some((r) => r.name.toLowerCase().includes(q)));
  const filteredEnvironments = environments.filter((e) => e.name.toLowerCase().includes(q));
  const filteredHistory = history.filter((h) => h.request.url.toLowerCase().includes(q) || h.request.method.toLowerCase().includes(q));

  const counts = { collections: collections.length, environments: environments.length, history: history.length };

  if (collapsed) {
    return (
      <div className="flex flex-col items-center h-full py-2 gap-1" style={{ background: 'var(--vsc-sidebar-bg)' }}>
        <button onClick={() => setCollapsed(false)} className="btn-ghost p-1.5" title="Expand sidebar">
          <PanelLeftOpen size={14} />
        </button>
        <div className="w-5 my-1" style={{ borderTop: '1px solid var(--vsc-border-visible)' }} />
        {(Object.keys(tabIcons) as Array<keyof typeof tabIcons>).map((tab) => {
          const Icon = tabIcons[tab];
          return (
            <button
              key={tab}
              onClick={() => { setSidebarTab(tab); setCollapsed(false); }}
              className={`btn-ghost p-1.5 ${sidebarTab === tab ? 'opacity-100' : 'opacity-40'}`}
              title={tab}
            >
              <Icon size={14} />
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--vsc-sidebar-bg)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-2 py-1.5 shrink-0" style={{ borderBottom: '1px solid var(--vsc-border-visible)' }}>
        <span className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: 'var(--vsc-desc)' }}>Explorer</span>
        <button onClick={() => setCollapsed(true)} className="btn-ghost p-0.5" title="Collapse sidebar">
          <PanelLeftClose size={13} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex shrink-0" style={{ borderBottom: '1px solid var(--vsc-border-visible)' }}>
        {(Object.keys(tabIcons) as Array<keyof typeof tabIcons>).map((tab) => {
          const Icon = tabIcons[tab];
          const active = sidebarTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setSidebarTab(tab)}
              className={`flex-1 flex items-center justify-center gap-1 px-1 py-1.5 text-[11px] capitalize transition-colors duration-150 border-b-2 ${active ? 'opacity-100' : 'opacity-50 hover:opacity-70'}`}
              style={{ borderColor: active ? 'var(--vsc-btn-bg)' : 'transparent', background: active ? 'var(--vsc-tab-active)' : 'transparent' }}
            >
              <Icon size={11} />
              <span className="hidden xl:inline">{tab}</span>
              <span className="badge ml-0.5">{counts[tab]}</span>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="px-2 py-1.5 shrink-0">
        <div className="relative">
          <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 opacity-40" />
          <input
            className="input-field w-full pl-6 text-[11px] py-1"
            placeholder={`Search ${sidebarTab}...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-2 pb-2">
        {sidebarTab === 'collections' && (
          <div className="flex flex-col gap-1">
            <div className="flex gap-1 mb-1">
              <input
                className="input-field flex-1 text-[11px] py-1"
                placeholder="New collection..."
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newName.trim()) {
                    postMessage({ type: 'createCollection', name: newName.trim() });
                    setNewName('');
                    addToast({ type: 'success', message: `Collection "${newName.trim()}" created` });
                  }
                }}
              />
              <button
                className="btn-primary py-1 px-2"
                onClick={() => {
                  if (newName.trim()) {
                    postMessage({ type: 'createCollection', name: newName.trim() });
                    addToast({ type: 'success', message: `Collection "${newName.trim()}" created` });
                    setNewName('');
                  }
                }}
              >+</button>
            </div>
            {filteredCollections.length === 0 && <p className="text-[11px] opacity-30 py-2 text-center">No collections</p>}
            {filteredCollections.map((col) => (
              <div key={col.id} className="flex flex-col gap-0.5">
                <div className="list-item flex items-center justify-between group" style={{ background: 'var(--vsc-input-bg)' }}>
                  <span className="text-[11px] font-medium truncate">{col.name}</span>
                  <button
                    className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity p-0.5"
                    onClick={() => showConfirm({
                      title: 'Delete Collection',
                      message: `Delete "${col.name}" and all its requests? This cannot be undone.`,
                      onConfirm: () => {
                        postMessage({ type: 'deleteCollection', id: col.id });
                        addToast({ type: 'info', message: `Collection "${col.name}" deleted` });
                      },
                    })}
                  ><X size={11} /></button>
                </div>
                {col.requests.map((req) => (
                  <button key={req.id} className="list-item text-left text-[11px] pl-4 truncate flex items-center gap-1.5" onClick={() => loadRequest(req)}>
                    <span className="font-mono text-[10px] opacity-50 shrink-0 w-7">{req.method.substring(0, 3)}</span>
                    <span className="truncate">{req.name}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}

        {sidebarTab === 'environments' && (
          <div className="flex flex-col gap-1.5">
            <button
              className="btn-primary text-[11px] self-start py-1"
              onClick={() => setEditingEnv({ id: Date.now().toString(), name: 'New Environment', variables: [{ key: '', value: '', enabled: true }] })}
            >+ New Environment</button>

            {editingEnv && (
              <div className="flex flex-col gap-2 p-2 rounded" style={{ background: 'var(--vsc-input-bg)', border: '1px solid var(--vsc-border-visible)' }}>
                <input
                  className="input-field text-[11px] py-1"
                  value={editingEnv.name}
                  onChange={(e) => setEditingEnv({ ...editingEnv, name: e.target.value })}
                />
                <KeyValueEditor
                  items={editingEnv.variables}
                  onChange={(variables) => setEditingEnv({ ...editingEnv, variables })}
                  keyPlaceholder="Variable"
                  valuePlaceholder="Value"
                />
                <div className="flex gap-1">
                  <button className="btn-primary py-1 text-[11px]" onClick={() => {
                    postMessage({ type: 'saveEnvironment', data: editingEnv });
                    addToast({ type: 'success', message: `Environment "${editingEnv.name}" saved` });
                    setEditingEnv(null);
                  }}>Save</button>
                  <button className="btn-secondary py-1 text-[11px]" onClick={() => setEditingEnv(null)}>Cancel</button>
                </div>
              </div>
            )}

            {filteredEnvironments.map((env) => (
              <div key={env.id} className="list-item flex items-center justify-between group" style={{ background: 'var(--vsc-input-bg)' }}>
                <button className="text-[11px] text-left flex-1 truncate" onClick={() => setEditingEnv({ ...env })}>{env.name}</button>
                <button
                  className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity p-0.5"
                  onClick={() => showConfirm({
                    title: 'Delete Environment',
                    message: `Delete "${env.name}"? This cannot be undone.`,
                    onConfirm: () => {
                      postMessage({ type: 'deleteEnvironment', id: env.id });
                      addToast({ type: 'info', message: `Environment "${env.name}" deleted` });
                    },
                  })}
                ><X size={11} /></button>
              </div>
            ))}
          </div>
        )}

        {sidebarTab === 'history' && (
          <div className="flex flex-col gap-0.5">
            {filteredHistory.length === 0 && <p className="text-[11px] opacity-30 py-2 text-center">No history</p>}
            {[...filteredHistory].reverse().map((entry) => (
              <button
                key={entry.id}
                className="list-item text-left text-[11px] flex items-center gap-1.5"
                onClick={() => loadRequest(entry.request)}
              >
                <span className="font-mono text-[10px] opacity-50 shrink-0 w-7">{entry.request.method.substring(0, 3)}</span>
                <span
                  className="shrink-0 text-[10px] text-center rounded px-1 font-medium"
                  style={{
                    color: '#000',
                    background: entry.response.status < 300 ? 'var(--vsc-success)' : entry.response.status < 400 ? 'var(--vsc-warning)' : 'var(--vsc-error)',
                  }}
                >{entry.response.status}</span>
                <span className="truncate opacity-70">{entry.request.url}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
