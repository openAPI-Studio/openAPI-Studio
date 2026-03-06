import React from 'react';
import { useAppStore } from '../stores/appStore';
import { useRequestStore } from '../stores/requestStore';
import { postMessage, Environment, KeyValue } from '../types/messages';
import { KeyValueEditor } from './KeyValueEditor';
import { Trash2, PanelLeftClose, PanelLeftOpen, Search, FolderOpen, Globe, Clock, ChevronRight, ChevronDown, FileText, Pencil } from 'lucide-react';

const tabIcons = { collections: FolderOpen, environments: Globe, history: Clock } as const;

const methodColor: Record<string, string> = {
  GET: '#61affe', POST: '#49cc90', PUT: '#fca130', PATCH: '#50e3c2', DELETE: '#f93e3e', HEAD: '#9012fe', OPTIONS: '#0d5aa7',
};

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
  const setResponse = useAppStore((s) => s.setResponse);
  const setViewedHistoryId = useAppStore((s) => s.setViewedHistoryId);

  const [editingEnv, setEditingEnv] = React.useState<Environment | null>(null);
  const [newName, setNewName] = React.useState('');
  const [collapsedNodes, setCollapsedNodes] = React.useState<Set<string>>(new Set());

  const toggleNode = (id: string) => {
    setCollapsedNodes((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const q = search.toLowerCase();
  const filteredCollections = collections.filter((c) => c.name.toLowerCase().includes(q) || c.requests.some((r) => r.name.toLowerCase().includes(q)));
  const filteredEnvironments = environments.filter((e) => e.name.toLowerCase().includes(q));
  const filteredHistory = history.filter((h) => h.request.url.toLowerCase().includes(q) || h.request.method.toLowerCase().includes(q));

  const counts = { collections: collections.length, environments: environments.length, history: history.length };

  const confirmDelete = (title: string, message: string, onConfirm: () => void) =>
    showConfirm({ title, message, onConfirm });

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
      <div className="flex shrink-0 overflow-hidden" style={{ borderBottom: '1px solid var(--vsc-border-visible)' }}>
        {(Object.keys(tabIcons) as Array<keyof typeof tabIcons>).map((tab) => {
          const Icon = tabIcons[tab];
          const active = sidebarTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setSidebarTab(tab)}
              className={`flex-1 min-w-0 flex items-center justify-center gap-1 px-1 py-1.5 text-[11px] capitalize transition-colors duration-150 border-b-2 overflow-hidden ${active ? 'opacity-100' : 'opacity-50 hover:opacity-70'}`}
              style={{ borderColor: active ? 'var(--vsc-btn-bg)' : 'transparent', background: active ? 'var(--vsc-tab-active)' : 'transparent' }}
            >
              <Icon size={11} className="shrink-0" />
              <span className="truncate">{tab}</span>
              <span className="badge ml-0.5 shrink-0">{counts[tab]}</span>
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
      <div className="flex-1 overflow-auto pb-2">

        {/* ── Collections ── */}
        {sidebarTab === 'collections' && (
          <div className="flex flex-col">
            <div className="flex gap-1 px-2 mb-1">
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
            {filteredCollections.length === 0 && <p className="text-[11px] opacity-30 py-4 text-center">No collections</p>}
            {filteredCollections.map((col) => (
              <div key={col.id}>
                {/* Collection folder row */}
                <div
                  className="flex items-center px-2 py-[6px] cursor-pointer transition-colors hover:bg-[var(--vsc-list-hover)]"
                  style={{ borderBottom: '1px solid var(--vsc-border-visible)' }}
                >
                  <button className="flex items-center gap-1.5 flex-1 min-w-0" onClick={() => toggleNode(col.id)}>
                    {collapsedNodes.has(col.id)
                      ? <ChevronRight size={12} className="shrink-0 opacity-50" />
                      : <ChevronDown size={12} className="shrink-0 opacity-50" />}
                    <FolderOpen size={13} className="shrink-0" style={{ color: 'var(--vsc-warning)' }} />
                    <span className="text-[12px] font-medium truncate">{col.name}</span>
                    <span className="text-[10px] opacity-30 shrink-0 ml-0.5">{col.requests.length}</span>
                  </button>
                  <button
                    className="shrink-0 p-0.5 rounded transition-colors opacity-40 hover:opacity-100"
                    style={{ color: 'var(--vsc-error)' }}
                    title={`Delete "${col.name}"`}
                    onClick={(e) => {
                      e.stopPropagation();
                      confirmDelete('Delete Collection', `Delete "${col.name}" and all its requests? This cannot be undone.`, () => {
                        postMessage({ type: 'deleteCollection', id: col.id });
                        addToast({ type: 'info', message: `Collection "${col.name}" deleted` });
                      });
                    }}
                  ><Trash2 size={12} /></button>
                </div>
                {/* Requests under collection */}
                {!collapsedNodes.has(col.id) && col.requests.map((req) => (
                  <div
                    key={req.id}
                    className="flex items-center gap-2 w-full pl-8 pr-2 py-[5px] transition-colors hover:bg-[var(--vsc-list-hover)]"
                    style={{ borderBottom: '1px solid var(--vsc-border-visible)' }}
                  >
                    <button
                      className="flex items-center gap-2 flex-1 min-w-0 text-left text-[11px]"
                      onClick={() => loadRequest(req)}
                    >
                      <FileText size={12} className="shrink-0 opacity-30" />
                      <span
                        className="font-mono text-[10px] font-bold shrink-0 uppercase"
                        style={{ color: methodColor[req.method] || 'var(--vsc-fg)' }}
                      >{req.method}</span>
                      <span className="truncate opacity-80">{req.name || req.url}</span>
                    </button>
                    <button
                      className="shrink-0 p-0.5 rounded transition-colors opacity-40 hover:opacity-100"
                      style={{ color: 'var(--vsc-error)' }}
                      title={`Delete "${req.name || req.url}"`}
                      onClick={() => confirmDelete('Delete Request', `Delete "${req.name || req.url}"? This cannot be undone.`, () => {
                        postMessage({ type: 'deleteRequest', collectionId: col.id, requestId: req.id });
                        addToast({ type: 'info', message: 'Request deleted' });
                      })}
                    ><Trash2 size={11} /></button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* ── Environments ── */}
        {sidebarTab === 'environments' && (
          <div className="flex flex-col">
            <div className="px-2 mb-1">
              <button
                className="btn-primary text-[11px] py-1 w-full"
                onClick={() => setEditingEnv({ id: Date.now().toString(), name: 'New Environment', variables: [{ key: '', value: '', enabled: true }] })}
              >+ New Environment</button>
            </div>

            {editingEnv && (
              <div className="mx-2 mb-1 flex flex-col gap-2 p-2 rounded overflow-hidden" style={{ background: 'var(--vsc-input-bg)', border: '1px solid var(--vsc-border-visible)' }}>
                <input
                  className="input-field text-[11px] py-1 w-full min-w-0"
                  value={editingEnv.name}
                  onChange={(e) => setEditingEnv({ ...editingEnv, name: e.target.value })}
                />
                <div className="overflow-hidden">
                  <KeyValueEditor
                    items={editingEnv.variables}
                    onChange={(variables) => setEditingEnv({ ...editingEnv, variables })}
                    keyPlaceholder="Variable"
                    valuePlaceholder="Value"
                  />
                </div>
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

            {filteredEnvironments.length === 0 && !editingEnv && <p className="text-[11px] opacity-30 py-4 text-center">No environments</p>}
            {filteredEnvironments.map((env) => (
              <div
                key={env.id}
                className="flex items-center px-2 py-[6px] transition-colors hover:bg-[var(--vsc-list-hover)]"
                style={{ borderBottom: '1px solid var(--vsc-border-visible)' }}
              >
                <button className="flex items-center gap-1.5 flex-1 min-w-0 text-left" onClick={() => setEditingEnv({ ...env })}>
                  <Globe size={13} className="shrink-0" style={{ color: 'var(--vsc-success)' }} />
                  <span className="text-[12px] truncate">{env.name}</span>
                  <Pencil size={10} className="shrink-0 opacity-20" />
                </button>
                <button
                  className="shrink-0 p-0.5 rounded transition-colors opacity-40 hover:opacity-100"
                  style={{ color: 'var(--vsc-error)' }}
                  title={`Delete "${env.name}"`}
                  onClick={() => confirmDelete('Delete Environment', `Delete "${env.name}"? This cannot be undone.`, () => {
                    postMessage({ type: 'deleteEnvironment', id: env.id });
                    addToast({ type: 'info', message: `Environment "${env.name}" deleted` });
                  })}
                ><Trash2 size={12} /></button>
              </div>
            ))}
          </div>
        )}

        {/* ── History ── */}
        {sidebarTab === 'history' && (
          <div className="flex flex-col">
            {filteredHistory.length === 0 && <p className="text-[11px] opacity-30 py-4 text-center">No history</p>}
            {[...filteredHistory].reverse().map((entry) => (
              <button
                key={entry.id}
                className="flex items-center gap-2 w-full text-left px-2 py-[6px] text-[11px] transition-colors hover:bg-[var(--vsc-list-hover)]"
                style={{ borderBottom: '1px solid var(--vsc-border-visible)' }}
                onClick={() => {
                  loadRequest(entry.request);
                  setResponse(entry.response);
                  setViewedHistoryId(entry.id);
                }}
              >
                <span
                  className="font-mono text-[10px] font-bold shrink-0 uppercase"
                  style={{ color: methodColor[entry.request.method] || 'var(--vsc-fg)' }}
                >{entry.request.method}</span>
                <span
                  className="shrink-0 text-[9px] text-center rounded px-1 py-px font-semibold"
                  style={{
                    color: '#000',
                    background: entry.response.status < 300 ? 'var(--vsc-success)' : entry.response.status < 400 ? 'var(--vsc-warning)' : 'var(--vsc-error)',
                  }}
                >{entry.response.status}</span>
                <span className="truncate opacity-60 text-[11px]">{entry.request.url.replace(/^https?:\/\//, '')}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
