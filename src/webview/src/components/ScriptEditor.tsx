import React from 'react';
import { useRequestStore } from '../stores/requestStore';

export function ScriptEditor() {
  const preRequestScript = useRequestStore((s) => s.preRequestScript);
  const testScript = useRequestStore((s) => s.testScript);
  const setPreRequestScript = useRequestStore((s) => s.setPreRequestScript);
  const setTestScript = useRequestStore((s) => s.setTestScript);

  const textareaStyle = { background: 'var(--input-bg)', color: 'var(--input-fg)', border: '1px solid var(--input-border)' };

  return (
    <div className="flex flex-col gap-3">
      <div>
        <label className="text-xs opacity-70 block mb-1">Pre-request Script</label>
        <textarea
          className="w-full h-28 px-3 py-2 rounded text-sm font-mono resize-y"
          style={textareaStyle}
          placeholder={'// Runs before the request is sent\n// Available: request, environment, console'}
          value={preRequestScript}
          onChange={(e) => setPreRequestScript(e.target.value)}
        />
      </div>
      <div>
        <label className="text-xs opacity-70 block mb-1">Test Script</label>
        <textarea
          className="w-full h-28 px-3 py-2 rounded text-sm font-mono resize-y"
          style={textareaStyle}
          placeholder={'// Runs after the response is received\n// Available: request, response, environment, console'}
          value={testScript}
          onChange={(e) => setTestScript(e.target.value)}
        />
      </div>
    </div>
  );
}
