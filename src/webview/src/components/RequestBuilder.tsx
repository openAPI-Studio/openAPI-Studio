import React from 'react';
import { useRequestStore } from '../stores/requestStore';
import { useAppStore } from '../stores/appStore';
import { postMessage, HttpMethod } from '../types/messages';
import { parseCurl } from '../types/curlParser';
import { Check, Save, ChevronDown } from 'lucide-react';
import { KeyValueEditor } from './KeyValueEditor';
import { BodyEditor } from './BodyEditor';
import { AuthPanel } from './AuthPanel';
import { ScriptEditor } from './ScriptEditor';

const methods: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

const methodColors: Record<HttpMethod, string> = {
  GET: '#61affe', POST: '#49cc90', PUT: '#fca130', PATCH: '#50e3c2',
  DELETE: '#f93e3e', HEAD: '#9012fe', OPTIONS: '#0d5aa7',
};

export function RequestBuilder() {
  const {
    method, url, params, headers, activeTab, name,
    setMethod, setUrl, setParams, setHeaders, setActiveTab, setBody, setAuth, setName, toApiRequest,
  } = useRequestStore();
  const setLoading = useAppStore((s) => s.setLoading);
  const setResponse = useAppStore((s) => s.setResponse);
  const setError = useAppStore((s) => s.setError);
  const addToast = useAppStore((s) => s.addToast);
  const collections = useAppStore((s) => s.collections);
  const [curlImported, setCurlImported] = React.useState(false);
  const [showSaveMenu, setShowSaveMenu] = React.useState(false);
  const [editingName, setEditingName] = React.useState(false);

  const handleCurlOrUrl = (value: string) => {
    const parsed = parseCurl(value);
    if (parsed) {
      setMethod(parsed.method);
      setUrl(parsed.url);
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

  const saveToCollection = (collectionId: string) => {
    const req = toApiRequest();
    postMessage({ type: 'saveRequest', data: { collectionId, request: req } });
    addToast({ type: 'success', message: `Saved to collection` });
    setShowSaveMenu(false);
  };

  const tabs = ['params', 'headers', 'body', 'auth', 'scripts'] as const;

  return (
    <div className="flex flex-col gap-2.5">
      {/* Request name */}
      <div className="flex items-center gap-2">
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
            className="text-xs font-medium opacity-60 hover:opacity-100 transition-opacity truncate text-left"
            onClick={() => setEditingName(true)}
            title="Click to rename"
          >
            {name || 'Untitled Request'}
          </button>
        )}
      </div>

      {/* URL bar */}
      <div className="flex gap-1">
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

        {/* Save dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowSaveMenu(!showSaveMenu)}
            className="btn-secondary shrink-0 flex items-center gap-1"
            title="Save to collection"
          >
            <Save size={12} />
            <ChevronDown size={10} />
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
                      onClick={() => saveToCollection(col.id)}
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

      {/* Tabs */}
      <div className="flex gap-0" style={{ borderBottom: '1px solid var(--vsc-border-visible)' }}>
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

      {/* Tab content */}
      <div className="min-h-[100px]">
        {activeTab === 'params' && <KeyValueEditor items={params} onChange={setParams} keyPlaceholder="Parameter" valuePlaceholder="Value" />}
        {activeTab === 'headers' && <KeyValueEditor items={headers} onChange={setHeaders} keyPlaceholder="Header" valuePlaceholder="Value" />}
        {activeTab === 'body' && <BodyEditor />}
        {activeTab === 'auth' && <AuthPanel />}
        {activeTab === 'scripts' && <ScriptEditor />}
      </div>
    </div>
  );
}
