import React from 'react';
import { useRequestStore } from '../stores/requestStore';
import { useAppStore } from '../stores/appStore';
import { postMessage, HttpMethod } from '../types/messages';
import { parseCurl } from '../types/curlParser';
import { KeyValueEditor } from './KeyValueEditor';
import { BodyEditor } from './BodyEditor';
import { AuthPanel } from './AuthPanel';
import { ScriptEditor } from './ScriptEditor';

const methods: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

const methodColors: Record<HttpMethod, string> = {
  GET: '#61affe',
  POST: '#49cc90',
  PUT: '#fca130',
  PATCH: '#50e3c2',
  DELETE: '#f93e3e',
  HEAD: '#9012fe',
  OPTIONS: '#0d5aa7',
};

export function RequestBuilder() {
  const {
    method, url, params, headers, activeTab,
    setMethod, setUrl, setParams, setHeaders, setActiveTab, setBody, setAuth, toApiRequest,
  } = useRequestStore();
  const setLoading = useAppStore((s) => s.setLoading);
  const setResponse = useAppStore((s) => s.setResponse);
  const setError = useAppStore((s) => s.setError);
  const [curlImported, setCurlImported] = React.useState(false);

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

  const tabs = ['params', 'headers', 'body', 'auth', 'scripts'] as const;

  return (
    <div className="flex flex-col gap-3">
      {/* URL bar */}
      <div className="flex gap-1">
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value as HttpMethod)}
          className="px-2 py-1.5 rounded text-sm font-bold shrink-0 w-28"
          style={{ background: 'var(--input-bg)', color: methodColors[method], border: '1px solid var(--input-border)' }}
        >
          {methods.map((m) => (
            <option key={m} value={m} style={{ color: methodColors[m] }}>{m}</option>
          ))}
        </select>
        <input
          className="flex-1 px-3 py-1.5 rounded text-sm"
          style={{ background: 'var(--input-bg)', color: 'var(--input-fg)', border: '1px solid var(--input-border)' }}
          placeholder="Enter URL or paste curl..."
          value={url}
          onChange={(e) => handleCurlOrUrl(e.target.value)}
          onPaste={handlePaste}
          onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') send(); }}
        />
        {curlImported && (
          <span className="flex items-center px-2 text-xs shrink-0" style={{ color: 'var(--success)' }}>
            ✓ curl imported
          </span>
        )}
        <button
          onClick={send}
          className="px-4 py-1.5 rounded text-sm font-medium shrink-0"
          style={{ background: 'var(--btn-bg)', color: 'var(--btn-fg)' }}
        >
          Send
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b" style={{ borderColor: 'var(--border)' }}>
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="px-3 py-1 text-sm capitalize"
            style={{
              background: activeTab === tab ? 'var(--tab-active)' : 'transparent',
              borderBottom: activeTab === tab ? '2px solid var(--btn-bg)' : '2px solid transparent',
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="min-h-[120px]">
        {activeTab === 'params' && (
          <KeyValueEditor items={params} onChange={setParams} keyPlaceholder="Parameter" valuePlaceholder="Value" />
        )}
        {activeTab === 'headers' && (
          <KeyValueEditor items={headers} onChange={setHeaders} keyPlaceholder="Header" valuePlaceholder="Value" />
        )}
        {activeTab === 'body' && <BodyEditor />}
        {activeTab === 'auth' && <AuthPanel />}
        {activeTab === 'scripts' && <ScriptEditor />}
      </div>
    </div>
  );
}
