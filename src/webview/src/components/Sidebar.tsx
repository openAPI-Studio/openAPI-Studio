import React from 'react';
import { useAppStore } from '../stores/appStore';
import { useRequestStore } from '../stores/requestStore';
import { postMessage, Environment, KeyValue } from '../types/messages';
import { KeyValueEditor } from './KeyValueEditor';

export function Sidebar() {
  const sidebarTab = useAppStore((s) => s.sidebarTab);
  const setSidebarTab = useAppStore((s) => s.setSidebarTab);
  const collections = useAppStore((s) => s.collections);
  const environments = useAppStore((s) => s.environments);
  const history = useAppStore((s) => s.history);
  const loadRequest = useRequestStore((s) => s.loadRequest);

  const [editingEnv, setEditingEnv] = React.useState<Environment | null>(null);
  const [newName, setNewName] = React.useState('');

  return (
    <div className="flex flex-col h-full" style={{ borderRight: '1px solid var(--border)' }}>
      {/* Tabs */}
      <div className="flex border-b" style={{ borderColor: 'var(--border)' }}>
        {(['collections', 'environments', 'history'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setSidebarTab(tab)}
            className="flex-1 px-2 py-1.5 text-xs capitalize"
            style={{
              background: sidebarTab === tab ? 'var(--tab-active)' : 'transparent',
              borderBottom: sidebarTab === tab ? '2px solid var(--btn-bg)' : '2px solid transparent',
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto p-2">
        {/* Collections */}
        {sidebarTab === 'collections' && (
          <div className="flex flex-col gap-1">
            <div className="flex gap-1 mb-2">
              <input
                className="flex-1 px-2 py-1 rounded text-xs"
                style={{ background: 'var(--input-bg)', color: 'var(--input-fg)', border: '1px solid var(--input-border)' }}
                placeholder="Collection name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newName.trim()) {
                    postMessage({ type: 'createCollection', name: newName.trim() });
                    setNewName('');
                  }
                }}
              />
              <button
                className="px-2 py-1 rounded text-xs"
                style={{ background: 'var(--btn-bg)', color: 'var(--btn-fg)' }}
                onClick={() => {
                  if (newName.trim()) {
                    postMessage({ type: 'createCollection', name: newName.trim() });
                    setNewName('');
                  }
                }}
              >+</button>
            </div>
            {collections.length === 0 && <p className="text-xs opacity-40">No collections yet</p>}
            {collections.map((col) => (
              <div key={col.id} className="flex flex-col gap-0.5">
                <div className="flex items-center justify-between px-1 py-0.5 rounded hover:opacity-80"
                  style={{ background: 'var(--input-bg)' }}>
                  <span className="text-xs font-medium">{col.name}</span>
                  <button
                    className="text-xs opacity-50 hover:opacity-100"
                    onClick={() => postMessage({ type: 'deleteCollection', id: col.id })}
                  >✕</button>
                </div>
                {col.requests.map((req) => (
                  <button
                    key={req.id}
                    className="text-left text-xs px-3 py-0.5 rounded hover:opacity-80 truncate"
                    onClick={() => loadRequest(req)}
                  >
                    <span className="font-mono opacity-60 mr-1">{req.method.substring(0, 3)}</span>
                    {req.name}
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Environments */}
        {sidebarTab === 'environments' && (
          <div className="flex flex-col gap-2">
            <button
              className="px-2 py-1 rounded text-xs self-start"
              style={{ background: 'var(--btn-bg)', color: 'var(--btn-fg)' }}
              onClick={() => {
                const env: Environment = { id: Date.now().toString(), name: 'New Environment', variables: [{ key: '', value: '', enabled: true }] };
                setEditingEnv(env);
              }}
            >+ New Environment</button>

            {editingEnv && (
              <div className="flex flex-col gap-2 p-2 rounded" style={{ background: 'var(--input-bg)' }}>
                <input
                  className="px-2 py-1 rounded text-xs"
                  style={{ background: 'var(--bg)', color: 'var(--input-fg)', border: '1px solid var(--input-border)' }}
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
                  <button
                    className="px-2 py-1 rounded text-xs"
                    style={{ background: 'var(--btn-bg)', color: 'var(--btn-fg)' }}
                    onClick={() => {
                      postMessage({ type: 'saveEnvironment', data: editingEnv });
                      setEditingEnv(null);
                    }}
                  >Save</button>
                  <button className="px-2 py-1 rounded text-xs opacity-60" onClick={() => setEditingEnv(null)}>Cancel</button>
                </div>
              </div>
            )}

            {environments.map((env) => (
              <div key={env.id} className="flex items-center justify-between px-2 py-1 rounded"
                style={{ background: 'var(--input-bg)' }}>
                <button className="text-xs text-left flex-1" onClick={() => setEditingEnv({ ...env })}>{env.name}</button>
                <button className="text-xs opacity-50 hover:opacity-100"
                  onClick={() => postMessage({ type: 'deleteEnvironment', id: env.id })}>✕</button>
              </div>
            ))}
          </div>
        )}

        {/* History */}
        {sidebarTab === 'history' && (
          <div className="flex flex-col gap-0.5">
            {history.length === 0 && <p className="text-xs opacity-40">No history yet</p>}
            {[...history].reverse().map((entry) => (
              <button
                key={entry.id}
                className="text-left text-xs px-1 py-1 rounded hover:opacity-80 flex items-center gap-2"
                onClick={() => loadRequest(entry.request)}
              >
                <span className="font-mono shrink-0 w-8 opacity-60">{entry.request.method.substring(0, 3)}</span>
                <span
                  className="shrink-0 w-8 text-center rounded px-1"
                  style={{
                    color: '#000',
                    background: entry.response.status < 300 ? 'var(--success)' : entry.response.status < 400 ? 'var(--warning)' : 'var(--error)',
                  }}
                >{entry.response.status}</span>
                <span className="truncate opacity-80">{entry.request.url}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
