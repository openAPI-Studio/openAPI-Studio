import React from 'react';
import { useAppStore } from '../stores/appStore';
import { JsonTreeView } from './JsonTreeView';

export function ResponseViewer() {
  const response = useAppStore((s) => s.response);
  const loading = useAppStore((s) => s.loading);
  const error = useAppStore((s) => s.error);
  const responseTab = useAppStore((s) => s.responseTab);
  const bodyViewMode = useAppStore((s) => s.bodyViewMode);
  const setResponseTab = useAppStore((s) => s.setResponseTab);
  const setBodyViewMode = useAppStore((s) => s.setBodyViewMode);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-8 justify-center opacity-50">
        <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        <span>Sending...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 rounded-md text-sm" style={{ background: 'rgba(244,71,71,0.08)', color: 'var(--error)' }}>
        <span>✕</span>
        <span>{error}</span>
      </div>
    );
  }

  if (!response) {
    return (
      <div className="flex flex-col items-center justify-center py-10 opacity-25 select-none">
        <span className="text-3xl mb-2">⚡</span>
        <span className="text-sm">Enter a URL and hit Send</span>
      </div>
    );
  }

  const isSuccess = response.status >= 200 && response.status < 300;
  const isRedirect = response.status >= 300 && response.status < 400;
  const statusColor = isSuccess ? 'var(--success)' : isRedirect ? 'var(--warning)' : 'var(--error)';

  let parsedJson: unknown = null;
  try { parsedJson = JSON.parse(response.body); } catch { /* not json */ }

  return (
    <div className="flex flex-col gap-3">
      {/* Status bar */}
      <div className="flex items-center gap-3">
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold"
          style={{ background: statusColor, color: '#000' }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#000', opacity: 0.3 }} />
          {response.status} {response.statusText}
        </span>
        <span className="text-xs opacity-50">{response.time} ms</span>
        <span className="text-xs opacity-50">{formatSize(response.size)}</span>
      </div>

      {/* Tabs */}
      <div className="flex gap-0.5">
        {(['body', 'headers'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setResponseTab(tab)}
            className="px-3 py-1.5 text-xs font-medium rounded-t capitalize transition-colors"
            style={{
              background: responseTab === tab ? 'var(--input-bg)' : 'transparent',
              opacity: responseTab === tab ? 1 : 0.5,
            }}
          >
            {tab}{tab === 'headers' ? ` (${Object.keys(response.headers).length})` : ''}
          </button>
        ))}
      </div>

      {/* Content area */}
      <div className="rounded-md overflow-hidden" style={{ background: 'var(--input-bg)' }}>
        {/* Body */}
        {responseTab === 'body' && (
          <div>
            {/* View mode switcher */}
            <div className="flex gap-1 px-3 pt-2 pb-1">
              {(['pretty', 'raw', ...(parsedJson ? ['tree'] : [])] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setBodyViewMode(mode as typeof bodyViewMode)}
                  className="px-2 py-0.5 text-[11px] rounded capitalize transition-colors"
                  style={{
                    background: bodyViewMode === mode ? 'var(--btn-bg)' : 'transparent',
                    color: bodyViewMode === mode ? 'var(--btn-fg)' : 'inherit',
                    opacity: bodyViewMode === mode ? 1 : 0.5,
                  }}
                >
                  {mode}
                </button>
              ))}
            </div>

            <div className="max-h-[400px] overflow-auto">
              {bodyViewMode === 'pretty' && (
                <pre className="px-3 pb-3 text-xs font-mono leading-relaxed whitespace-pre-wrap break-all">
                  {parsedJson ? JSON.stringify(parsedJson, null, 2) : response.body}
                </pre>
              )}

              {bodyViewMode === 'raw' && (
                <pre className="px-3 pb-3 text-xs font-mono leading-relaxed whitespace-pre-wrap break-all opacity-70">
                  {response.body}
                </pre>
              )}

              {bodyViewMode === 'tree' && parsedJson && (
                <div className="px-3 pb-3 text-xs font-mono">
                  <JsonTreeView data={parsedJson} />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Headers */}
        {responseTab === 'headers' && (
          <div className="max-h-[300px] overflow-auto">
            {Object.entries(response.headers).map(([k, v]) => (
              <div
                key={k}
                className="flex px-3 py-1.5 text-xs border-b last:border-b-0"
                style={{ borderColor: 'rgba(255,255,255,0.05)' }}
              >
                <span className="w-1/3 shrink-0 font-mono font-medium opacity-80">{k}</span>
                <span className="font-mono opacity-50 break-all">{v}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
