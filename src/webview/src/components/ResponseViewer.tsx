import React from 'react';
import { useAppStore } from '../stores/appStore';
import { useRequestStore } from '../stores/requestStore';
import { postMessage, Snapshot } from '../types/messages';
import { JsonTreeView } from './JsonTreeView';
import { X, Zap, Copy, Clock, ArrowDownToLine, ChevronDown, ChevronRight, Bookmark, Trash2 } from 'lucide-react';

function log(level: 'info' | 'warn' | 'error', message: string, data?: unknown) {
  postMessage({ type: 'log', level, message, data: data !== undefined ? String(data).slice(0, 2000) : undefined });
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error) { log('error', 'ResponseBody crash', error.message + '\n' + error.stack); }
  render() {
    if (this.state.error) return (
      <div className="p-3 text-[11px] font-mono" style={{ color: 'var(--vsc-error)' }}>
        <div className="font-semibold mb-1">Render error:</div>
        <pre className="whitespace-pre-wrap opacity-70">{this.state.error.message}{'\n'}{this.state.error.stack}</pre>
        <button className="mt-2 btn-ghost text-[10px] opacity-60 hover:opacity-100" onClick={() => this.setState({ error: null })}>Retry</button>
      </div>
    );
    return this.props.children;
  }
}

type Lang = 'json' | 'xml' | 'html' | 'javascript' | 'css' | 'yaml' | 'graphql' | 'typescript' | 'text';
const LANGS: Lang[] = ['json', 'xml', 'html', 'yaml', 'graphql', 'typescript', 'javascript', 'css', 'text'];

function detectLang(ct: string, body: string): Lang {
  const c = (ct || '').toLowerCase();
  if (c.includes('json')) return 'json';
  if (c.includes('yaml') || c.includes('yml')) return 'yaml';
  if (c.includes('graphql')) return 'graphql';
  if (c.includes('typescript')) return 'typescript';
  if (c.includes('xml')) return 'xml';
  if (c.includes('html')) return 'html';
  if (c.includes('javascript') || c.includes('ecmascript')) return 'javascript';
  if (c.includes('css')) return 'css';
  const t = body.trimStart();
  if (t.startsWith('{') || t.startsWith('[')) return 'json';
  if (t.startsWith('<!DOCTYPE html') || t.startsWith('<html')) return 'html';
  if (t.startsWith('<?xml') || t.startsWith('<')) return 'xml';
  if (/^(type |query |mutation |subscription |schema |enum |input |interface )/.test(t)) return 'graphql';
  return 'text';
}

function hlJson(line: string): React.ReactNode {
  const p: React.ReactNode[] = [];
  const re = /("(?:\\.|[^"\\])*")\s*(:)?|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|(\btrue\b|\bfalse\b)|(\bnull\b)|([{}\[\],:])/g;
  let l = 0, m: RegExpExecArray | null, guard = 0;
  while ((m = re.exec(line)) !== null && guard++ < 500) {
    if (m[0].length === 0) { re.lastIndex++; continue; }
    if (m.index > l) p.push(line.slice(l, m.index));
    if (m[1] && m[2]) { p.push(<span key={m.index} style={{ color: '#9cdcfe' }}>{m[1]}</span>); p.push(m[2]); }
    else if (m[1]) p.push(<span key={m.index} style={{ color: '#ce9178' }}>{m[1]}</span>);
    else if (m[3]) p.push(<span key={m.index} style={{ color: '#b5cea8' }}>{m[0]}</span>);
    else if (m[4] || m[5]) p.push(<span key={m.index} style={{ color: '#569cd6' }}>{m[0]}</span>);
    else p.push(<span key={m.index} style={{ color: '#808080' }}>{m[0]}</span>);
    l = m.index + m[0].length;
  }
  if (l < line.length) p.push(line.slice(l));
  return <>{p}</>;
}

function hlXml(line: string): React.ReactNode {
  const p: React.ReactNode[] = [];
  const re = /(<!--.*?-->)|(<\/?[\w:-]+)|(\/?>)|(\s[\w:-]+)(=)("[^"]*"|'[^']*')/g;
  let l = 0, m: RegExpExecArray | null, guard = 0;
  while ((m = re.exec(line)) !== null && guard++ < 500) {
    if (m[0].length === 0) { re.lastIndex++; continue; }
    if (m.index > l) p.push(line.slice(l, m.index));
    if (m[1]) p.push(<span key={m.index} style={{ color: '#6a9955' }}>{m[0]}</span>);
    else if (m[2]) p.push(<span key={m.index} style={{ color: '#569cd6' }}>{m[2]}</span>);
    else if (m[3]) p.push(<span key={m.index} style={{ color: '#569cd6' }}>{m[3]}</span>);
    else if (m[4]) { p.push(<span key={m.index} style={{ color: '#9cdcfe' }}>{m[4]}</span>); p.push(<span key={m.index+'e'} style={{ color: '#808080' }}>{m[5]}</span>); p.push(<span key={m.index+'v'} style={{ color: '#ce9178' }}>{m[6]}</span>); }
    l = m.index + m[0].length;
  }
  if (l < line.length) p.push(line.slice(l));
  return <>{p}</>;
}

const JS_KW = new Set(['const','let','var','if','else','return','function','true','false','null','undefined','typeof','new','this','for','while','of','in','class','import','export','from','async','await','try','catch','throw']);
function hlJs(line: string): React.ReactNode {
  const p: React.ReactNode[] = [];
  const re = /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)|(-?\b\d+(?:\.\d+)?\b)|(\/\/.*$)|(\b[a-zA-Z_$]\w*\b)|([{}()\[\];,.:=<>!&|?+\-*/])/g;
  let l = 0, m: RegExpExecArray | null, guard = 0;
  while ((m = re.exec(line)) !== null && guard++ < 500) {
    if (m[0].length === 0) { re.lastIndex++; continue; }
    if (m.index > l) p.push(line.slice(l, m.index));
    if (m[1]) p.push(<span key={m.index} style={{ color: '#ce9178' }}>{m[0]}</span>);
    else if (m[2]) p.push(<span key={m.index} style={{ color: '#b5cea8' }}>{m[0]}</span>);
    else if (m[3]) p.push(<span key={m.index} style={{ color: '#6a9955' }}>{m[0]}</span>);
    else if (m[4]) p.push(<span key={m.index} style={{ color: JS_KW.has(m[4]) ? '#c586c0' : '#9cdcfe' }}>{m[0]}</span>);
    else p.push(<span key={m.index} style={{ color: '#808080' }}>{m[0]}</span>);
    l = m.index + m[0].length;
  }
  if (l < line.length) p.push(line.slice(l));
  return <>{p}</>;
}

function hlCss(line: string): React.ReactNode {
  const p: React.ReactNode[] = [];
  const re = /(\/\*.*?\*\/)|([.#@]?[\w-]+)(\s*\{)|([\w-]+)(\s*:)|([{};\)])/g;
  let l = 0, m: RegExpExecArray | null, guard = 0;
  while ((m = re.exec(line)) !== null && guard++ < 500) {
    if (m[0].length === 0) { re.lastIndex++; continue; }
    if (m.index > l) p.push(line.slice(l, m.index));
    if (m[1]) p.push(<span key={m.index} style={{ color: '#6a9955' }}>{m[0]}</span>);
    else if (m[2]) { p.push(<span key={m.index} style={{ color: '#d7ba7d' }}>{m[2]}</span>); p.push(<span key={m.index+'b'} style={{ color: '#808080' }}>{m[3]}</span>); }
    else if (m[4]) { p.push(<span key={m.index} style={{ color: '#9cdcfe' }}>{m[4]}</span>); p.push(<span key={m.index+'c'} style={{ color: '#808080' }}>{m[5]}</span>); }
    else p.push(<span key={m.index} style={{ color: '#808080' }}>{m[0]}</span>);
    l = m.index + m[0].length;
  }
  if (l < line.length) p.push(line.slice(l));
  return <>{p}</>;
}

function hl(line: string, lang: Lang): React.ReactNode {
  try {
    if (lang === 'json') return hlJson(line);
    if (lang === 'xml' || lang === 'html') return hlXml(line);
    if (lang === 'javascript') return hlJs(line);
    if (lang === 'css') return hlCss(line);
  } catch (_e) { log('error', 'hl() crash', `lang=${lang} line=${line.slice(0, 200)} err=${_e}`); }
  return line;
}

function computeFolds(lines: string[], lang: Lang): Map<number, number> {
  const ranges = new Map<number, number>();
  if (lang === 'json' || lang === 'javascript') {
    const stack: number[] = [];
    for (let i = 0; i < lines.length; i++) {
      const t = lines[i].trimEnd();
      if (t.endsWith('{') || t.endsWith('[')) stack.push(i);
      const s = lines[i].trimStart();
      if ((s.startsWith('}') || s.startsWith(']')) && stack.length) {
        const start = stack.pop()!;
        if (i > start + 1) ranges.set(start, i);
      }
    }
  } else if (lang === 'xml' || lang === 'html') {
    const stack: { tag: string; line: number }[] = [];
    for (let i = 0; i < lines.length; i++) {
      const close = lines[i].match(/<\/([\w:-]+)/);
      if (close && stack.length && stack[stack.length - 1].tag === close[1]) {
        const s = stack.pop()!;
        if (i > s.line + 1) ranges.set(s.line, i);
      } else {
        const open = lines[i].match(/<([\w:-]+)(?:\s|>)/);
        if (open && !lines[i].includes('/>')) stack.push({ tag: open[1], line: i });
      }
    }
  }
  return ranges;
}

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
  const snapshots = useAppStore((s) => s.snapshots);
  const viewedSnapshotRecord = useAppStore((s) => s.viewedSnapshotRecord);
  const setViewedSnapshotRecord = useAppStore((s) => s.setViewedSnapshotRecord);
  const url = useRequestStore((s) => s.url);
  const sourceRequestId = useRequestStore((s) => s.sourceRequestId);
  const [showHistoryMenu, setShowHistoryMenu] = React.useState(false);
  const [selectedContractStatus, setSelectedContractStatus] = React.useState<number | null>(null);

  const ct = (latestResponse?.headers?.['content-type'] || '');
  const bodyText = latestResponse?.body || '';
  const detectedLang = React.useMemo(() => detectLang(ct, bodyText), [ct, bodyText]);
  const [langOverride, setLangOverride] = React.useState<{ lang: Lang; ct: string } | null>(null);
  const lang = (langOverride && langOverride.ct === ct) ? langOverride.lang : detectedLang;
  const setLang = (l: Lang) => setLangOverride({ lang: l, ct });

  // Filter history for current URL
  const urlHistory = React.useMemo(
    () => [...history].filter((h) => h.request.url === url).sort((a, b) => b.timestamp - a.timestamp),
    [history, url],
  );

  // Resolve which response to display
  const viewedEntry = viewedHistoryId ? urlHistory.find((h) => h.id === viewedHistoryId) : null;
  const response = viewedEntry ? viewedEntry.response : latestResponse;
  const activeSnapshot = React.useMemo<Snapshot | null>(
    () => sourceRequestId ? snapshots.find((s) => s.baseRequest.id === sourceRequestId) || null : null,
    [snapshots, sourceRequestId],
  );
  const contractBuckets = React.useMemo(
    () => {
      const raw = activeSnapshot?.responseContracts;
      if (!Array.isArray(raw)) return [];
      return raw
        .filter((bucket) => typeof bucket?.status === 'number' && Array.isArray((bucket as any).variants))
        .map((bucket) => ({
          ...bucket,
          variants: bucket.variants
            .filter((variant) => variant && typeof variant.id === 'string')
            .map((variant) => ({
              ...variant,
              history: Array.isArray(variant.history) ? variant.history : [],
              occurrences: typeof variant.occurrences === 'number' ? variant.occurrences : 0,
              lastSeen: typeof variant.lastSeen === 'number' ? variant.lastSeen : 0,
              summary: typeof variant.summary === 'string' ? variant.summary : '',
            })),
        }))
        .sort((a, b) => a.status - b.status);
    },
    [activeSnapshot],
  );
  const selectedContractBucket = React.useMemo(
    () => (selectedContractStatus === null ? null : contractBuckets.find((bucket) => bucket.status === selectedContractStatus) || null),
    [contractBuckets, selectedContractStatus],
  );

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
      <div className="flex flex-col gap-2.5" style={{ opacity: 0.25, pointerEvents: 'none', userSelect: 'none' }}>
        <div className="flex flex-col gap-1.5 rounded-md px-3 py-2" style={{ background: 'var(--vsc-input-bg)' }}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider font-semibold opacity-40">Response</span>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold" style={{ background: 'var(--vsc-badge-bg)', color: 'var(--vsc-badge-fg)' }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'currentColor', opacity: 0.25 }} />
              0
            </span>
            <span className="flex items-center gap-1 text-[11px] opacity-50">
              <Clock size={10} /> <span className="opacity-70">Time</span> <span className="font-medium">0 ms</span>
            </span>
            <span className="flex items-center gap-1 text-[11px] opacity-50">
              <ArrowDownToLine size={10} /> <span className="opacity-70">Size</span> <span className="font-medium">0 B</span>
            </span>
          </div>
        </div>
        <div className="flex gap-0" style={{ borderBottom: '1px solid var(--vsc-border-visible)' }}>
          {['body', 'headers', 'cookies', 'tests'].map((tab) => (
            <span key={tab} className={tab === 'body' ? 'tab-btn-active' : 'tab-btn'}>{tab}</span>
          ))}
        </div>
        <div className="rounded overflow-hidden" style={{ background: 'var(--vsc-input-bg)' }}>
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <Zap size={24} />
            <span className="text-xs">Enter a URL and hit Send</span>
          </div>
        </div>
      </div>
    );
  }

  const isSuccess = response.status >= 200 && response.status < 300;
  const isRedirect = response.status >= 300 && response.status < 400;
  const statusColor = isSuccess ? 'var(--vsc-success)' : isRedirect ? 'var(--vsc-warning)' : 'var(--vsc-error)';

  let parsedJson: unknown = null;
  try { parsedJson = JSON.parse(response.body); } catch { /* not json */ }

  const deleteHistoryEntry = (entryId: string) => {
    if (viewedHistoryId === entryId) {
      setViewedHistoryId(null);
    }
    postMessage({ type: 'deleteHistory', id: entryId });
    addToast({ type: 'info', message: 'History entry deleted' });
  };

  return (
    <div className="flex flex-col gap-2.5">
      {/* Snapshot record banner */}
      {viewedSnapshotRecord && (() => {
        const snap = snapshots.find(s => s.id === viewedSnapshotRecord.snapshotId);
        if (!snap) return null;
        return (
          <div
            className="flex items-center gap-2 px-2 py-1.5 rounded text-[11px]"
            style={{ background: 'rgba(80,160,255,0.10)', border: '1px solid rgba(80,160,255,0.25)', color: 'var(--vsc-info)' }}
          >
            <Bookmark size={11} className="shrink-0" />
            <span className="flex-1 truncate">
              Viewing snapshot: <strong>{snap.name}</strong> &mdash; {new Date(viewedSnapshotRecord.record.timestamp).toLocaleString()}
            </span>
            <button
              className="shrink-0 opacity-50 hover:opacity-100 transition-opacity"
              title="Clear snapshot view"
              onClick={() => setViewedSnapshotRecord(null)}
            ><X size={11} /></button>
          </div>
        );
      })()}
      {/* Status bar */}
      <div className="flex items-center gap-3 px-1">
        <span
          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold"
          style={{ background: statusColor, color: '#000' }}
        >
          {response.status} {response.statusText}
        </span>
        <span className="flex items-center gap-1 text-[11px] opacity-50">
          <Clock size={10} /> <span className="font-medium">{response.time} ms</span>
        </span>
        <span className="flex items-center gap-1 text-[11px] opacity-50">
          <ArrowDownToLine size={10} /> <span className="font-medium">{formatSize(response.size)}</span>
        </span>
        {activeSnapshot && contractBuckets.length > 0 && (
          <div className="flex items-center gap-1">
            <span className="text-[10px] opacity-30 mr-0.5">|</span>
            {contractBuckets.map((bucket) => (
              <button
                key={bucket.status}
                onClick={() => setSelectedContractStatus(bucket.status)}
                className="px-1.5 py-0 rounded text-[10px] font-medium flex items-center gap-1 transition-opacity hover:opacity-100 opacity-70"
                style={{ border: '1px solid var(--vsc-border-visible)' }}
                title={`Status ${bucket.status}: ${bucket.variants.length} type${bucket.variants.length !== 1 ? 's' : ''}`}
              >
                <span className="px-0.5 rounded text-[9px] font-semibold" style={{ color: '#000', background: bucket.status < 300 ? 'var(--vsc-success)' : bucket.status < 400 ? 'var(--vsc-warning)' : 'var(--vsc-error)' }}>{bucket.status}</span>
                <span className="opacity-60">{bucket.variants.length}T</span>
              </button>
            ))}
          </div>
        )}
        {urlHistory.length > 0 && (
          <div className="relative ml-auto">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowHistoryMenu(!showHistoryMenu)}
                className="btn-ghost text-[11px] flex items-center gap-1 opacity-50 hover:opacity-100"
              >
                <Clock size={10} />
                {viewedEntry ? formatTime(viewedEntry.timestamp) : 'Latest'}
                <ChevronDown size={9} />
              </button>
              <button
                onClick={() => deleteHistoryEntry(viewedEntry?.id || urlHistory[0].id)}
                className="btn-ghost text-[11px] flex items-center gap-1 opacity-40 hover:opacity-100"
                title="Delete selected history"
              >
                <Trash2 size={10} />
              </button>
            </div>
            {showHistoryMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowHistoryMenu(false)} />
                <div
                  className="absolute right-0 top-full mt-1 z-50 rounded shadow-vsc py-1 min-w-[180px] max-h-[200px] overflow-auto"
                  style={{ background: 'var(--vsc-dropdown-bg)', border: '1px solid var(--vsc-dropdown-border)' }}
                >
                  {urlHistory.map((entry, i) => (
                    <div
                      key={entry.id}
                      className={`w-full px-3 py-1.5 text-[11px] flex items-center gap-2 transition-colors hover:bg-vsc-list-hover ${entry.id === (viewedHistoryId || urlHistory[0]?.id) ? 'opacity-100' : 'opacity-60'}`}
                    >
                      <button
                        className="flex items-center gap-2 flex-1 min-w-0 text-left"
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
                      <button
                        className="shrink-0 opacity-30 hover:opacity-100 transition-opacity"
                        title="Delete history entry"
                        onClick={() => deleteHistoryEntry(entry.id)}
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {selectedContractBucket && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setSelectedContractStatus(null)} />
          <div
            className="fixed left-1/2 top-1/2 z-50 w-[95vw] max-w-[960px] -translate-x-1/2 -translate-y-1/2 rounded flex flex-col"
            style={{ background: 'var(--vsc-editor-bg)', border: '1px solid var(--vsc-border-visible)', maxHeight: '80vh' }}
          >
            <div className="flex items-center justify-between px-3 py-2 shrink-0" style={{ borderBottom: '1px solid var(--vsc-border-visible)' }}>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold">Status {selectedContractBucket.status}</span>
                <span className="text-[11px] opacity-50">{selectedContractBucket.variants.length} response type version{selectedContractBucket.variants.length !== 1 ? 's' : ''}</span>
              </div>
              <button className="btn-ghost p-1" onClick={() => setSelectedContractStatus(null)} title="Close contract details">
                <X size={12} />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-3 flex flex-col gap-2">
              {[...selectedContractBucket.variants]
                .sort((a, b) => b.lastSeen - a.lastSeen)
                .map((variant) => (
                  <div key={variant.id} className="rounded p-2" style={{ border: '1px solid var(--vsc-border-visible)', background: 'var(--vsc-input-bg)' }}>
                    <div className="flex items-center gap-2 mb-1.5 text-[11px]">
                      {selectedContractBucket.latestVariantId === variant.id && (
                        <span className="text-[9px] px-1 rounded" style={{ background: 'var(--vsc-success)', color: '#000' }}>LATEST</span>
                      )}
                      <span className="opacity-70">Seen {variant.occurrences}×</span>
                      <span className="opacity-50">First: {formatDateTime(variant.firstSeen)}</span>
                      <span className="opacity-50">Last: {formatDateTime(variant.lastSeen)}</span>
                    </div>
                    <p className="text-[10px] uppercase tracking-wider opacity-50 mb-1">Type Signature</p>
                    <pre
                      className="text-[10px] whitespace-pre-wrap break-all p-2 rounded max-h-[220px] overflow-auto"
                      style={{ background: 'var(--vsc-editor-bg)' }}
                    >
                      {variant.signature || variant.summary}
                    </pre>
                    {variant.summary && variant.summary !== variant.signature && (
                      <>
                        <p className="text-[10px] uppercase tracking-wider opacity-50 mt-2 mb-1">Summary</p>
                        <pre
                          className="text-[10px] whitespace-pre-wrap break-all p-2 rounded max-h-[120px] overflow-auto"
                          style={{ background: 'var(--vsc-editor-bg)' }}
                        >
                          {variant.summary}
                        </pre>
                      </>
                    )}
                    <p className="text-[10px] uppercase tracking-wider opacity-50 mt-2 mb-1">Version History</p>
                    <div className="text-[10px] opacity-70 max-h-[120px] overflow-auto">
                      {variant.history.length > 0 ? (
                        variant.history
                          .slice()
                          .sort((a, b) => a.timestamp - b.timestamp)
                          .map((historyItem, index) => (
                            <div key={`${variant.id}-${historyItem.recordId}-${index}`} className="py-0.5">
                              v{index + 1} · {formatDateTime(historyItem.timestamp)}
                            </div>
                          ))
                      ) : (
                        <div className="opacity-40">No history available</div>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </>
      )}

      {/* Tabs */}
      <div className="flex gap-0" style={{ borderBottom: '1px solid var(--vsc-border-visible)' }}>
        {(['body', 'headers', 'cookies', 'tests'] as const).map((tab) => {
          const results = response.testResults || [];
          const passed = results.filter(r => r.passed).length;
          return (
            <button
              key={tab}
              onClick={() => setResponseTab(tab)}
              className={responseTab === tab ? 'tab-btn-active' : 'tab-btn'}
            >
              {tab}
              {tab === 'headers' ? ` (${Object.keys(response.headers).length})` : ''}
              {tab === 'cookies' ? ` (${response.cookies?.length || 0})` : ''}
              {tab === 'tests' && results.length > 0 ? ` (${passed}/${results.length})` : ''}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="rounded overflow-hidden" style={{ background: 'var(--vsc-input-bg)' }}>
        {responseTab === 'body' && (
          <div>
            <div className="flex items-center gap-1 px-2.5 pt-2 pb-1">
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
              <div className="ml-auto">
                <select className="select-field text-[10px] py-0.5 px-1.5" value={lang} onChange={(e) => setLang(e.target.value as Lang)}>
                  {LANGS.map((l) => <option key={l} value={l}>{l.toUpperCase()}</option>)}
                </select>
              </div>
            </div>

            {bodyViewMode === 'pretty' && <ErrorBoundary><ResponseBody body={response.body} lang={lang} addToast={addToast} /></ErrorBoundary>}
            {bodyViewMode === 'raw' && <ErrorBoundary><ResponseBody body={response.body} lang="text" addToast={addToast} /></ErrorBoundary>}
            {bodyViewMode === 'tree' && parsedJson !== null && (
              <div className="px-2.5 pb-2.5 text-[11px] font-mono max-h-[500px] overflow-auto">
                <JsonTreeView data={parsedJson} />
              </div>
            )}
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

        {responseTab === 'cookies' && (
          <div className="max-h-[400px] overflow-auto">
            {(!response.cookies || response.cookies.length === 0) ? (
              <p className="text-[11px] opacity-30 py-4 text-center">No cookies in this response</p>
            ) : (
              <>
                <div className="flex px-2.5 py-1.5 text-[10px] uppercase tracking-wider opacity-40 font-semibold" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  <span className="w-[20%] shrink-0">Name</span>
                  <span className="w-[25%] shrink-0">Value</span>
                  <span className="w-[15%] shrink-0">Domain</span>
                  <span className="w-[10%] shrink-0">Path</span>
                  <span className="w-[15%] shrink-0">Expires</span>
                  <span className="w-[15%]">Flags</span>
                </div>
                {response.cookies.map((c, i) => (
                  <div key={i} className="flex px-2.5 py-1.5 text-[11px] font-mono items-center" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <span className="w-[20%] shrink-0 truncate font-medium opacity-70" title={c.name}>{c.name}</span>
                    <span className="w-[25%] shrink-0 truncate opacity-40" title={c.value}>{c.value}</span>
                    <span className="w-[15%] shrink-0 truncate opacity-40">{c.domain}</span>
                    <span className="w-[10%] shrink-0 truncate opacity-40">{c.path}</span>
                    <span className="w-[15%] shrink-0 truncate opacity-40">{c.expires ? new Date(c.expires).toLocaleDateString() : 'Session'}</span>
                    <span className="w-[15%] flex gap-1 flex-wrap">
                      {c.httpOnly && <span className="px-1 rounded text-[9px] opacity-60" style={{ background: 'rgba(128,128,128,0.2)' }}>HttpOnly</span>}
                      {c.secure && <span className="px-1 rounded text-[9px] opacity-60" style={{ background: 'rgba(128,128,128,0.2)' }}>Secure</span>}
                      {c.sameSite && <span className="px-1 rounded text-[9px] opacity-60" style={{ background: 'rgba(128,128,128,0.2)' }}>{c.sameSite}</span>}
                    </span>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {responseTab === 'tests' && (
          <div className="max-h-[400px] overflow-auto">
            {(!response.testResults || response.testResults.length === 0) ? (
              <p className="text-[11px] opacity-30 py-4 text-center">No tests configured for this request</p>
            ) : (() => {
              const results = response.testResults!;
              const passed = results.filter(r => r.passed).length;
              const failed = results.length - passed;
              return (
                <>
                  <div className="flex items-center gap-3 px-2.5 py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(128,128,128,0.2)' }}>
                      <div className="h-full rounded-full" style={{ width: `${(passed / results.length) * 100}%`, background: passed === results.length ? 'var(--vsc-success)' : 'var(--vsc-warning)' }} />
                    </div>
                    <span className="text-[11px] shrink-0">
                      <span style={{ color: 'var(--vsc-success)' }}>{passed} passed</span>
                      {failed > 0 && <span style={{ color: 'var(--vsc-error)' }}>, {failed} failed</span>}
                    </span>
                  </div>
                  {results.map((r, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 px-2.5 py-2 text-[11px]"
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', borderLeft: `3px solid ${r.passed ? 'var(--vsc-success)' : 'var(--vsc-error)'}` }}
                    >
                      <span className="shrink-0 mt-0.5">{r.passed ? '✅' : '❌'}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium opacity-80">{r.label}</div>
                        {!r.passed && (
                          <div className="flex gap-3 mt-0.5 font-mono text-[10px]">
                            <span className="opacity-40">actual: <span style={{ color: 'var(--vsc-error)' }}>{r.actual.length > 100 ? r.actual.slice(0, 100) + '…' : r.actual}</span></span>
                            <span className="opacity-40">expected: <span style={{ color: 'var(--vsc-success)' }}>{r.expected.length > 100 ? r.expected.slice(0, 100) + '…' : r.expected}</span></span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}

function inferJsonType(val: unknown, indent = ''): string {
  if (val === null) return 'null';
  if (Array.isArray(val)) {
    if (val.length === 0) return 'unknown[]';
    return inferJsonType(val[0], indent) + '[]';
  }
  if (typeof val === 'object') {
    const entries = Object.entries(val as Record<string, unknown>);
    if (entries.length === 0) return '{}';
    const inner = indent + '  ';
    const fields = entries.map(([k, v]) => `${inner}${k}: ${inferJsonType(v, inner)};`).join('\n');
    return `{\n${fields}\n${indent}}`;
  }
  return typeof val; // string | number | boolean
}

function extractSchema(body: string, lang: Lang): string {
  const UNSUPPORTED = ['html', 'javascript', 'css', 'text'] as const;
  if ((UNSUPPORTED as readonly string[]).includes(lang)) return `Schema extraction not supported for ${lang}`;

  try {
    if (lang === 'json') {
      const parsed = JSON.parse(body);
      if (Array.isArray(parsed)) return `type Response = ${inferJsonType(parsed[0] ?? null)}[];`;
      return `interface Response ${inferJsonType(parsed)}`;
    }

    if (lang === 'yaml') {
      const lines = body.split('\n').filter(l => l.trim() && !l.trim().startsWith('#'));
      const fields: string[] = [];
      for (const line of lines) {
        const m = line.match(/^(\s*)([\w.-]+)\s*:\s*(.*)/);
        if (!m) continue;
        const [, , key, val] = m;
        const v = val.trim();
        let t = 'string';
        if (v === '' || v === '~' || v === 'null') t = 'null';
        else if (v === 'true' || v === 'false') t = 'boolean';
        else if (/^-?\d+(\.\d+)?$/.test(v)) t = 'number';
        else if (v.startsWith('[')) t = 'unknown[]';
        fields.push(`  ${key}: ${t};`);
      }
      if (fields.length === 0) return 'Failed to parse yaml: no key-value pairs found';
      return `interface Response {\n${fields.join('\n')}\n}`;
    }

    if (lang === 'xml') {
      const elements = new Map<string, { attrs: Set<string>; children: Set<string>; hasText: boolean }>();
      const tagRe = /<(\/?)(\w[\w:-]*)((?:\s+[\w:-]+(?:="[^"]*"|='[^']*'))*)\s*(\/?)>/g;
      let m: RegExpExecArray | null;
      while ((m = tagRe.exec(body)) !== null) {
        const [, closing, tag, attrStr, selfClose] = m;
        if (!elements.has(tag)) elements.set(tag, { attrs: new Set(), children: new Set(), hasText: false });
        const el = elements.get(tag)!;
        const attrRe = /([\w:-]+)=/g;
        let am: RegExpExecArray | null;
        while ((am = attrRe.exec(attrStr)) !== null) el.attrs.add(am[1]);
        if (!closing && !selfClose) {
          // find parent context — simplified: look for next closing tag content
          const after = body.slice(m.index + m[0].length, m.index + m[0].length + 500);
          const childTags = after.match(/<(\w[\w:-]*)/g);
          if (childTags) childTags.forEach(ct => el.children.add(ct.slice(1)));
          if (/^[^<]+/.test(after) && after.match(/^[^<]+/)?.[0].trim()) el.hasText = true;
        }
      }
      if (elements.size === 0) return 'Failed to parse xml: no elements found';
      const out: string[] = [];
      elements.forEach((info, tag) => {
        const parts: string[] = [];
        info.attrs.forEach(a => parts.push(`@${a}: string`));
        info.children.forEach(c => parts.push(`${c}: ${c}`));
        if (info.hasText) parts.push('#text: string');
        out.push(`interface ${tag} {\n${parts.map(p => '  ' + p + ';').join('\n')}\n}`);
      });
      return out.join('\n\n');
    }

    if (lang === 'graphql') {
      const blocks = body.match(/(type|input|interface|enum|scalar|union)\s+\w+[^}]*\}/gs);
      if (!blocks || blocks.length === 0) return 'Failed to parse graphql: no type definitions found';
      return blocks.join('\n\n');
    }

    if (lang === 'typescript') {
      const blocks = body.match(/(export\s+)?(interface|type|enum)\s+\w+[^}]*\}/gs);
      if (!blocks || blocks.length === 0) return 'Failed to parse typescript: no type declarations found';
      return blocks.join('\n\n');
    }

    return `Schema extraction not supported for ${lang}`;
  } catch (e: any) {
    return `Failed to parse ${lang}: ${e.message || e}`;
  }
}

function ResponseBody({ body, lang, addToast }: { body: string; lang: Lang; addToast: (t: { type: 'success' | 'error' | 'info'; message: string }) => void }) {
  const [collapsed, setCollapsed] = React.useState<Set<number>>(new Set());
  const formatted = React.useMemo(() => {
    if (lang === 'json') { try { return JSON.stringify(JSON.parse(body), null, 2); } catch (_e) { /* ignore */ } }
    return body;
  }, [body, lang]);
  const lines = React.useMemo(() => formatted.split('\n'), [formatted]);
  const truncated = lines.length > 5000;
  const cappedLines = React.useMemo(() => truncated ? lines.slice(0, 5000) : lines, [lines, truncated]);
  const folds = React.useMemo(() => { try { return computeFolds(cappedLines, lang); } catch (_e) { log('error', 'computeFolds crash', String(_e)); return new Map<number, number>(); } }, [cappedLines, lang]);

  const toggle = (i: number) => setCollapsed((p) => { const n = new Set(p); n.has(i) ? n.delete(i) : n.add(i); return n; });

  const visible = React.useMemo(() => {
    const out: { idx: number; line: string; foldable: boolean; folded: boolean }[] = [];
    let skip = -1;
    for (let i = 0; i < cappedLines.length; i++) {
      if (i <= skip) continue;
      const end = folds.get(i);
      const isFolded = collapsed.has(i);
      out.push({ idx: i, line: cappedLines[i], foldable: !!end, folded: isFolded });
      if (isFolded && end) skip = end;
    }
    return out;
  }, [cappedLines, folds, collapsed]);

  const highlighted = React.useMemo(() => {
    if (lang === 'text') return null;
    const map = new Map<number, React.ReactNode>();
    for (const v of visible) {
      map.set(v.idx, hl(v.line, lang));
    }
    return map;
  }, [visible, lang]);

  const gutterW = String(cappedLines.length).length * 8 + 16;

  const copySchema = () => {
    const schema = extractSchema(body, lang);
    const failed = schema.startsWith('Failed') || schema.startsWith('Schema extraction not');
    navigator.clipboard.writeText(schema);
    addToast({ type: failed ? 'error' : 'info', message: failed ? schema : 'Schema copied' });
  };

  return (
    <div className="max-h-[500px] overflow-auto relative">
      <div className="absolute top-1 right-2 z-10 flex items-center gap-1">
        <button
          className="btn-ghost text-[10px] flex items-center gap-1 opacity-30 hover:opacity-100"
          onClick={copySchema}
          title="Copy Schema"
        >
          <Copy size={10} /> Schema
        </button>
        <button
          className="btn-ghost text-[10px] flex items-center gap-1 opacity-30 hover:opacity-100"
          onClick={() => { navigator.clipboard.writeText(body); addToast({ type: 'info', message: 'Copied' }); }}
          title="Copy"
        >
          <Copy size={10} /> Copy
        </button>
      </div>
      {truncated && (
        <div className="px-2.5 py-1 text-[10px] opacity-50" style={{ background: 'rgba(255,200,0,0.08)' }}>
          Showing first 5,000 of {lines.length.toLocaleString()} lines
        </div>
      )}
      <pre className="text-[11px] font-mono leading-relaxed m-0 pb-2">
        {visible.map((v) => (
          <div key={v.idx} className="flex hover:bg-[rgba(255,255,255,0.02)]" style={{ minHeight: '1.4em' }}>
            <span className="shrink-0 text-right pr-2 select-none inline-flex items-center justify-end" style={{ width: gutterW, color: 'var(--vsc-desc)', opacity: 0.35, fontSize: '10px' }}>
              {v.foldable ? (
                <span className="cursor-pointer inline-flex items-center" onClick={() => toggle(v.idx)}>
                  {v.folded ? <ChevronRight size={9} /> : <ChevronDown size={9} />}
                  {v.idx + 1}
                </span>
              ) : (
                v.idx + 1
              )}
            </span>
            <span className="flex-1 whitespace-pre-wrap break-all px-1">
              {highlighted ? highlighted.get(v.idx) : v.line}
              {v.folded && <span className="opacity-30 ml-1 cursor-pointer text-[10px] px-1 rounded" style={{ background: 'var(--vsc-badge-bg)' }} onClick={() => toggle(v.idx)}>…</span>}
            </span>
          </div>
        ))}
      </pre>
    </div>
  );
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

function formatDateTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleString();
}
