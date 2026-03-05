import React from 'react';
import { useRequestStore } from '../stores/requestStore';
import { useAppStore } from '../stores/appStore';
import { postMessage, HttpMethod } from '../types/messages';
import { parseCurl } from '../types/curlParser';
import { Check, Save, ChevronDown, Pencil, Code, X } from 'lucide-react';
import { KeyValueEditor } from './KeyValueEditor';
import { BodyEditor } from './BodyEditor';
import { AuthPanel } from './AuthPanel';
import { STANDARD_HEADERS, HEADER_VALUES } from '../data/headers';
import { ScriptEditor } from './ScriptEditor';
import { CodeExportPanel } from './CodeExportPanel';
import { LANGUAGES, CodeLanguage } from '../utils/codeGen';

const methods: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

const methodColors: Record<HttpMethod, string> = {
  GET: '#61affe', POST: '#49cc90', PUT: '#fca130', PATCH: '#50e3c2',
  DELETE: '#f93e3e', HEAD: '#9012fe', OPTIONS: '#0d5aa7',
};

export function RequestBuilder() {
  const {
    method, url, params, headers, activeTab, name, sourceRequestId, sourceCollectionId,
    setMethod, setUrl, setUrlRaw, setParams, setHeaders, setActiveTab, setBody, setAuth, setName, toApiRequest,
  } = useRequestStore();
  const setLoading = useAppStore((s) => s.setLoading);
  const setResponse = useAppStore((s) => s.setResponse);
  const setError = useAppStore((s) => s.setError);
  const addToast = useAppStore((s) => s.addToast);
  const showCodePanel = useAppStore((s) => s.showCodePanel);
  const setShowCodePanel = useAppStore((s) => s.setShowCodePanel);
  const codePanelRatio = useAppStore((s) => s.codePanelRatio);
  const setCodePanelRatio = useAppStore((s) => s.setCodePanelRatio);
  const collections = useAppStore((s) => s.collections);
  const [curlImported, setCurlImported] = React.useState(false);
  const [showSaveMenu, setShowSaveMenu] = React.useState(false);
  const [editingName, setEditingName] = React.useState(false);
  const [codeLang, setCodeLang] = React.useState<CodeLanguage>('curl');

  const hasSource = !!(sourceRequestId && sourceCollectionId);

  const handleCurlOrUrl = (value: string) => {
    const parsed = parseCurl(value);
    if (parsed) {
      setMethod(parsed.method);
      setUrlRaw(parsed.url);
      setHeaders(parsed.headers.length ? parsed.headers : [{ key: 'Accept', value: 'application/json', enabled: true }]);
      setBody(parsed.body);
      setAuth(parsed.auth);
      if (parsed.body.type !== 'none') setActiveTab('body');
      setCurlImported(true);
      addToast({ type: 'info', message: 'cURL command imported' });
      setTimeout(() => setCurlImported(false), 3000);
    } else {
      setUrl(value);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text');
    if (pasted.trim().startsWith('curl ') || pasted.trim().startsWith('curl\n')) {
      e.preventDefault();
      handleCurlOrUrl(pasted);
    }
  };

  const send = () => {
    if (!url.trim()) return;
    setLoading(true);
    setResponse(null);
    setError(null);
    postMessage({ type: 'sendRequest', data: toApiRequest() });
  };

  const saveUpdate = () => {
    if (!sourceCollectionId) return;
    const req = toApiRequest();
    postMessage({ type: 'saveRequest', data: { collectionId: sourceCollectionId, request: req } });
    addToast({ type: 'success', message: 'Request updated' });
  };

  const saveCopyTo = (collectionId: string) => {
    const req = toApiRequest();
    req.id = Date.now().toString(); // new id for the copy
    postMessage({ type: 'saveRequest', data: { collectionId, request: req } });
    addToast({ type: 'success', message: 'Saved to collection' });
    setShowSaveMenu(false);
  };

  const tabs = ['params', 'headers', 'body', 'auth', 'scripts'] as const;

  return (
    <div className="flex flex-col gap-2.5 h-full overflow-hidden">
      {/* Request name + save buttons */}
      <div className="flex items-center gap-2 shrink-0">
        {editingName ? (
          <input
            className="input-field text-xs font-medium flex-1"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => setEditingName(false)}
            onKeyDown={(e) => { if (e.key === 'Enter') setEditingName(false); }}
            autoFocus
          />
        ) : (
          <button
            className="group flex items-center gap-1 text-xs font-medium opacity-60 hover:opacity-100 transition-opacity truncate text-left"
            onClick={() => setEditingName(true)}
            title="Click to rename"
          >
            {name || 'Untitled Request'}
            <Pencil size={10} className="opacity-0 group-hover:opacity-60 transition-opacity shrink-0" />
          </button>
        )}
        <div className="flex items-center gap-1 ml-auto shrink-0">
          {hasSource && (
            <button onClick={saveUpdate} className="btn-primary shrink-0 p-1.5" title="Save">
              <Save size={13} />
            </button>
          )}
          <div className="relative">
            <button
              onClick={() => setShowSaveMenu(!showSaveMenu)}
              className="btn-secondary shrink-0 flex items-center gap-0.5 p-1.5"
              title="Save to collection"
            >
              <Save size={13} />
              <ChevronDown size={9} />
            </button>
            {showSaveMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowSaveMenu(false)} />
                <div
                  className="absolute right-0 top-full mt-1 z-50 rounded shadow-vsc py-1 min-w-[160px]"
                  style={{ background: 'var(--vsc-dropdown-bg)', border: '1px solid var(--vsc-dropdown-border)' }}
                >
                  {collections.length === 0 ? (
                    <p className="px-3 py-2 text-[11px] opacity-40">No collections yet</p>
                  ) : (
                    collections.map((col) => (
                      <button
                        key={col.id}
                        className="w-full text-left px-3 py-1.5 text-[11px] transition-colors hover:bg-vsc-list-hover"
                        onClick={() => saveCopyTo(col.id)}
                      >
                        {col.name}
                      </button>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* URL bar */}
      <div className="flex gap-1 shrink-0">
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value as HttpMethod)}
          className="select-field font-bold shrink-0 w-24 text-xs"
          style={{ color: methodColors[method] }}
        >
          {methods.map((m) => (
            <option key={m} value={m} style={{ color: methodColors[m] }}>{m}</option>
          ))}
        </select>
        <input
          className="input-field flex-1 text-xs"
          placeholder="Enter URL or paste curl..."
          value={url}
          onChange={(e) => handleCurlOrUrl(e.target.value)}
          onPaste={handlePaste}
          onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') send(); }}
        />
        {curlImported && (
          <span className="flex items-center gap-1 px-2 text-[11px] shrink-0" style={{ color: 'var(--vsc-success)' }}>
            <Check size={12} /> imported
          </span>
        )}
        <button onClick={send} className="btn-primary shrink-0 flex items-center gap-1">
          Send
          <span className="text-[9px] opacity-50">⌘↵</span>
        </button>
        <button
          onClick={() => setShowCodePanel(!showCodePanel)}
          className={`shrink-0 p-1.5 rounded transition-colors ${showCodePanel ? 'btn-primary' : 'btn-ghost'}`}
          style={!showCodePanel ? { background: 'var(--vsc-input-bg)' } : {}}
          title="Toggle code view"
        >
          <Code size={13} />
        </button>
      </div>

      {/* Tabs + Code split */}
      <div className="flex flex-1 overflow-hidden" style={{ minHeight: 0 }}>
        {/* Left: tabs + content */}
        <div className="flex flex-col overflow-hidden" style={{ width: showCodePanel ? `${codePanelRatio * 100}%` : '100%' }}>
          <div className="flex gap-0 shrink-0" style={{ borderBottom: '1px solid var(--vsc-border-visible)' }}>
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={activeTab === tab ? 'tab-btn-active' : 'tab-btn'}
              >
                {tab}
              </button>
            ))}
          </div>
          <div style={{ flex: '1 1 0%', overflow: 'auto', minHeight: 0, paddingTop: '0.5rem' }}>
            {activeTab === 'params' && <KeyValueEditor items={params} onChange={setParams} keyPlaceholder="Parameter" valuePlaceholder="Value" />}
            {activeTab === 'headers' && <KeyValueEditor items={headers} onChange={setHeaders} keyPlaceholder="Header" valuePlaceholder="Value" keySuggestions={STANDARD_HEADERS} valueSuggestionsMap={HEADER_VALUES} />}
            {activeTab === 'body' && <BodyEditor />}
            {activeTab === 'auth' && <AuthPanel />}
            {activeTab === 'scripts' && <ScriptEditor />}
          </div>
        </div>

        {/* Draggable divider + Code panel */}
        {showCodePanel && (
          <>
            <div
              className="shrink-0 w-[3px] cursor-col-resize hover:bg-vsc-btn-bg active:bg-vsc-btn-bg transition-colors"
              style={{ background: 'var(--vsc-border-visible)' }}
              onMouseDown={(e) => {
                e.preventDefault();
                const container = e.currentTarget.parentElement!;
                const startX = e.clientX;
                const startRatio = codePanelRatio;
                const w = container.getBoundingClientRect().width;
                const onMove = (ev: MouseEvent) => {
                  const delta = ev.clientX - startX;
                  const next = Math.max(0.2, Math.min(0.8, startRatio + delta / w));
                  setCodePanelRatio(next);
                };
                const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
                document.addEventListener('mousemove', onMove);
                document.addEventListener('mouseup', onUp);
              }}
              onDoubleClick={() => setCodePanelRatio(0.5)}
            />
            <div className="flex flex-col overflow-hidden" style={{ width: `${(1 - codePanelRatio) * 100}%` }}>
              <div className="flex items-center justify-between shrink-0 px-2 py-1" style={{ borderBottom: '1px solid var(--vsc-border-visible)' }}>
                <span className="text-[10px] uppercase tracking-wider font-semibold opacity-50">Code</span>
                <div className="flex items-center gap-1">
                  <select
                    value={codeLang}
                    onChange={(e) => setCodeLang(e.target.value as CodeLanguage)}
                    className="select-field text-[10px] py-0 px-1"
                  >
                    {LANGUAGES.map((l) => (
                      <option key={l.value} value={l.value}>{l.label}</option>
                    ))}
                  </select>
                  <button onClick={() => setShowCodePanel(false)} className="btn-ghost p-0.5" title="Close code panel">
                    <X size={12} />
                  </button>
                </div>
              </div>
              <div style={{ flex: '1 1 0%', overflow: 'auto', minHeight: 0, padding: '0.5rem' }}>
                <CodeExportPanel lang={codeLang} />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
