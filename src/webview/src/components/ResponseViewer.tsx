import React from 'react';
import { useAppStore } from '../stores/appStore';
import { useRequestStore } from '../stores/requestStore';
import { JsonTreeView } from './JsonTreeView';
import { X, Zap, Copy, Clock, ArrowDownToLine, ChevronDown } from 'lucide-react';

export function ResponseViewer() {
  const latestResponse = useAppStore((s) => s.response);
  const loading = useAppStore((s) => s.loading);
  const error = useAppStore((s) => s.error);
  const responseTab = useAppStore((s) => s.responseTab);
  const bodyViewMode = useAppStore((s) => s.bodyViewMode);
  const setResponseTab = useAppStore((s) => s.setResponseTab);
  const setBodyViewMode = useAppStore((s) => s.setBodyViewMode);
  const addToast = useAppStore((s) => s.addToast);
  const history = useAppStore((s) => s.history);
  const viewedHistoryId = useAppStore((s) => s.viewedHistoryId);
  const setViewedHistoryId = useAppStore((s) => s.setViewedHistoryId);
  const url = useRequestStore((s) => s.url);
  const [showHistoryMenu, setShowHistoryMenu] = React.useState(false);

  // Filter history for current URL
  const urlHistory = React.useMemo(
    () => [...history].filter((h) => h.request.url === url).sort((a, b) => b.timestamp - a.timestamp),
    [history, url],
  );

  // Resolve which response to display
  const viewedEntry = viewedHistoryId ? urlHistory.find((h) => h.id === viewedHistoryId) : null;
  const response = viewedEntry ? viewedEntry.response : latestResponse;

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex gap-3">
          <div className="skeleton h-6 w-20 rounded" />
          <div className="skeleton h-4 w-12 rounded" />
          <div className="skeleton h-4 w-12 rounded" />
        </div>
        <div className="flex gap-1">
          <div className="skeleton h-7 w-14 rounded" />
          <div className="skeleton h-7 w-16 rounded" />
        </div>
        <div className="rounded" style={{ background: 'var(--vsc-input-bg)' }}>
          <div className="p-3 flex flex-col gap-2">
            {[100, 80, 90, 60, 85, 70, 95, 50].map((w, i) => (
              <div key={i} className="skeleton h-3 rounded" style={{ width: `${w}%` }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 px-3 py-2.5 rounded text-xs" style={{ background: 'rgba(244,71,71,0.08)', color: 'var(--vsc-error)' }}>
        <X size={13} className="shrink-0" />
        <span>{error}</span>
      </div>
    );
  }

  if (!response) {
    return (
      <div className="flex flex-col items-center justify-center h-full opacity-20 select-none gap-2">
        <Zap size={28} />
        <span className="text-xs">Enter a URL and hit Send</span>
      </div>
    );
  }

  const isSuccess = response.status >= 200 && response.status < 300;
  const isRedirect = response.status >= 300 && response.status < 400;
  const statusColor = isSuccess ? 'var(--vsc-success)' : isRedirect ? 'var(--vsc-warning)' : 'var(--vsc-error)';

  let parsedJson: unknown = null;
  try { parsedJson = JSON.parse(response.body); } catch { /* not json */ }

  const copyBody = () => {
    navigator.clipboard.writeText(response.body);
    addToast({ type: 'info', message: 'Response copied to clipboard' });
  };

  return (
    <div className="flex flex-col gap-2.5">
      {/* Status bar */}
      <div className="flex flex-col gap-1.5 rounded-md px-3 py-2" style={{ background: 'var(--vsc-input-bg)' }}>
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-wider font-semibold opacity-40">Response</span>
          <div className="flex items-center gap-1.5">
            <button onClick={copyBody} className="btn-ghost text-[11px] flex items-center gap-1 opacity-50 hover:opacity-100" title="Copy response body">
              <Copy size={11} /> Copy
            </button>
            {urlHistory.length > 1 && (
          <div className="relative">
            <button
              onClick={() => setShowHistoryMenu(!showHistoryMenu)}
              className="btn-ghost text-[11px] flex items-center gap-1 opacity-50 hover:opacity-100"
            >
              <Clock size={10} />
              {viewedEntry ? formatTime(viewedEntry.timestamp) : 'Latest'}
              <ChevronDown size={9} />
            </button>
            {showHistoryMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowHistoryMenu(false)} />
                <div
                  className="absolute right-0 top-full mt-1 z-50 rounded shadow-vsc py-1 min-w-[180px] max-h-[200px] overflow-auto"
                  style={{ background: 'var(--vsc-dropdown-bg)', border: '1px solid var(--vsc-dropdown-border)' }}
                >
                  {urlHistory.map((entry, i) => (
                    <button
                      key={entry.id}
                      className={`w-full text-left px-3 py-1.5 text-[11px] flex items-center gap-2 transition-colors hover:bg-vsc-list-hover ${entry.id === (viewedHistoryId || urlHistory[0]?.id) ? 'opacity-100' : 'opacity-60'}`}
                      onClick={() => {
                        setViewedHistoryId(i === 0 && !viewedHistoryId ? null : entry.id === urlHistory[0]?.id ? null : entry.id);
                        setShowHistoryMenu(false);
                      }}
                    >
                      <span
                        className="shrink-0 text-[10px] rounded px-1 font-medium"
                        style={{
                          color: '#000',
                          background: entry.response.status < 300 ? 'var(--vsc-success)' : entry.response.status < 400 ? 'var(--vsc-warning)' : 'var(--vsc-error)',
                        }}
                      >{entry.response.status}</span>
                      <span>{formatTime(entry.timestamp)}</span>
                      <span className="opacity-40 ml-auto">{entry.response.time}ms</span>
                      {i === 0 && <span className="text-[9px] opacity-40">(latest)</span>}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
          </div>
        </div>
        <div className="flex items-center gap-3 mt-1">
          <span
            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold"
            style={{ background: statusColor, color: '#000' }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#000', opacity: 0.25 }} />
            {response.status} {response.statusText}
          </span>
          <span className="flex items-center gap-1 text-[11px] opacity-50">
            <Clock size={10} /> <span className="opacity-70">Time</span> <span className="font-medium">{response.time} ms</span>
          </span>
          <span className="flex items-center gap-1 text-[11px] opacity-50">
            <ArrowDownToLine size={10} /> <span className="opacity-70">Size</span> <span className="font-medium">{formatSize(response.size)}</span>
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0" style={{ borderBottom: '1px solid var(--vsc-border-visible)' }}>
        {(['body', 'headers'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setResponseTab(tab)}
            className={responseTab === tab ? 'tab-btn-active' : 'tab-btn'}
          >
            {tab}{tab === 'headers' ? ` (${Object.keys(response.headers).length})` : ''}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="rounded overflow-hidden" style={{ background: 'var(--vsc-input-bg)' }}>
        {responseTab === 'body' && (
          <div>
            <div className="flex gap-1 px-2.5 pt-2 pb-1">
              {(['pretty', 'raw', ...(parsedJson ? ['tree'] : [])] as string[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setBodyViewMode(mode as typeof bodyViewMode)}
                  className={`px-2 py-0.5 text-[10px] rounded capitalize transition-colors duration-150 ${bodyViewMode === mode ? '' : 'opacity-40 hover:opacity-70'}`}
                  style={bodyViewMode === mode ? { background: 'var(--vsc-btn-bg)', color: 'var(--vsc-btn-fg)' } : {}}
                >
                  {mode}
                </button>
              ))}
            </div>

            <div className="max-h-[500px] overflow-auto">
              {bodyViewMode === 'pretty' && (
                <pre className="px-2.5 pb-2.5 text-[11px] font-mono leading-relaxed whitespace-pre-wrap break-all">
                  {parsedJson ? <SyntaxColoredJson json={parsedJson} /> : response.body}
                </pre>
              )}
              {bodyViewMode === 'raw' && (
                <pre className="px-2.5 pb-2.5 text-[11px] font-mono leading-relaxed whitespace-pre-wrap break-all opacity-60">
                  {response.body}
                </pre>
              )}
              {bodyViewMode === 'tree' && parsedJson !== null && (
                <div className="px-2.5 pb-2.5 text-[11px] font-mono">
                  <JsonTreeView data={parsedJson} />
                </div>
              )}
            </div>
          </div>
        )}

        {responseTab === 'headers' && (
          <div className="max-h-[400px] overflow-auto">
            {Object.entries(response.headers).map(([k, v]) => (
              <div key={k} className="flex px-2.5 py-1.5 text-[11px]" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <span className="w-1/3 shrink-0 font-mono font-medium opacity-70">{k}</span>
                <span className="font-mono opacity-40 break-all">{v}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SyntaxColoredJson({ json }: { json: unknown }) {
  const text = JSON.stringify(json, null, 2);
  const parts: React.ReactNode[] = [];
  const regex = /("(?:\\.|[^"\\])*")\s*(:)?|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|(\btrue\b|\bfalse\b)|(\bnull\b)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    if (match[1] && match[2]) {
      parts.push(<span key={match.index} style={{ color: '#9cdcfe' }}>{match[1]}</span>);
      parts.push(match[2]);
    } else if (match[1]) {
      parts.push(<span key={match.index} style={{ color: '#ce9178' }}>{match[1]}</span>);
    } else if (match[3]) {
      parts.push(<span key={match.index} style={{ color: '#b5cea8' }}>{match[3]}</span>);
    } else if (match[4] || match[5]) {
      parts.push(<span key={match.index} style={{ color: '#569cd6' }}>{match[0]}</span>);
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return <>{parts}</>;
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
