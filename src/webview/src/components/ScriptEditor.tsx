import React, { useState } from 'react';
import { useRequestStore } from '../stores/requestStore';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { HighlightedEditor } from './HighlightedEditor';

const PRE_SNIPPETS = [
  { label: 'Set header', code: 'request.headers["X-Custom"] = "value";' },
  { label: 'Set timestamp', code: 'request.headers["X-Timestamp"] = Date.now().toString();' },
  { label: 'Read env var', code: 'const token = environment.get("token");\nrequest.headers["Authorization"] = `Bearer ${token}`;' },
  { label: 'Set env var', code: 'environment.set("key", "value");' },
];

const TEST_SNIPPETS = [
  { label: 'Assert status', code: 'console.assert(response.status === 200, "Expected 200");' },
  { label: 'Parse JSON', code: 'const data = response.json();\nconsole.log("Response:", data);' },
  { label: 'Check field', code: 'const data = response.json();\nconsole.assert(data.id !== undefined, "Missing id");' },
  { label: 'Save to env', code: 'const data = response.json();\nenvironment.set("token", data.token);' },
  { label: 'Check time', code: 'console.assert(response.time < 1000, "Too slow: " + response.time + "ms");' },
];

function SnippetBar({ snippets, onInsert }: { snippets: { label: string; code: string }[]; onInsert: (code: string) => void }) {
  return (
    <div className="flex gap-1 flex-wrap">
      {snippets.map((s) => (
        <button
          key={s.label}
          onClick={() => onInsert(s.code)}
          className="px-1.5 py-0.5 rounded text-[9px] opacity-50 hover:opacity-100 transition-opacity"
          style={{ background: 'rgba(128,128,128,0.15)' }}
          title={s.code}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}

export function ScriptEditor() {
  const preRequestScript = useRequestStore((s) => s.preRequestScript);
  const testScript = useRequestStore((s) => s.testScript);
  const setPreRequestScript = useRequestStore((s) => s.setPreRequestScript);
  const setTestScript = useRequestStore((s) => s.setTestScript);
  const [showRef, setShowRef] = useState(false);

  const insertPre = (code: string) => setPreRequestScript(preRequestScript ? preRequestScript + '\n' + code : code);
  const insertTest = (code: string) => setTestScript(testScript ? testScript + '\n' + code : code);

  return (
    <div className="flex flex-col gap-3">
      {/* Reference */}
      <button
        onClick={() => setShowRef(!showRef)}
        className="flex items-center gap-1 text-[10px] opacity-40 hover:opacity-70 self-start"
      >
        {showRef ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
        JavaScript Reference
      </button>
      {showRef && (
        <div className="text-[10px] font-mono rounded p-2 leading-relaxed opacity-60" style={{ background: 'rgba(128,128,128,0.1)' }}>
          <div className="font-sans font-semibold opacity-70 mb-1">Available Objects</div>
          <div><span className="text-blue-400">request</span> — {'{ url, method, headers, body, params }'}</div>
          <div><span className="text-blue-400">response</span> — {'{ status, statusText, headers, body, time, json() }'} <span className="opacity-40">(test script only)</span></div>
          <div><span className="text-blue-400">environment</span>.get(<span className="text-orange-300">"key"</span>) → string</div>
          <div><span className="text-blue-400">environment</span>.set(<span className="text-orange-300">"key"</span>, <span className="text-orange-300">"value"</span>)</div>
          <div><span className="text-blue-400">console</span>.log(...args) — output to test log</div>
          <div><span className="text-blue-400">console</span>.assert(condition, message) — assertion</div>
          <div className="mt-1 opacity-40">Runs in Node.js sandbox • 5s timeout • No imports/require</div>
        </div>
      )}

      {/* Pre-request */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-[10px] opacity-50">Pre-request Script</label>
          <SnippetBar snippets={PRE_SNIPPETS} onInsert={insertPre} />
        </div>
        <HighlightedEditor
          value={preRequestScript}
          onChange={setPreRequestScript}
          placeholder={'// Runs before the request is sent\n// Modify request headers, params, or body\n// Read/write environment variables'}
          className="h-28"
        />
      </div>

      {/* Test script */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-[10px] opacity-50">Test Script</label>
          <SnippetBar snippets={TEST_SNIPPETS} onInsert={insertTest} />
        </div>
        <HighlightedEditor
          value={testScript}
          onChange={setTestScript}
          placeholder={'// Runs after the response is received\n// Assert status, parse JSON, save values to env\n// Output appears in response body'}
          className="h-28"
        />
      </div>
    </div>
  );
}
