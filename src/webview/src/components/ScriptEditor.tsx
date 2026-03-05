import React from 'react';
import { useRequestStore } from '../stores/requestStore';

export function ScriptEditor() {
  const preRequestScript = useRequestStore((s) => s.preRequestScript);
  const testScript = useRequestStore((s) => s.testScript);
  const setPreRequestScript = useRequestStore((s) => s.setPreRequestScript);
  const setTestScript = useRequestStore((s) => s.setTestScript);

  return (
    <div className="flex flex-col gap-3">
      <div>
        <label className="text-[10px] opacity-50 block mb-1">Pre-request Script</label>
        <textarea
          className="input-field w-full h-28 font-mono text-[11px] resize-y"
          placeholder={'// Runs before the request is sent\n// Available: request, environment, console'}
          value={preRequestScript}
          onChange={(e) => setPreRequestScript(e.target.value)}
        />
      </div>
      <div>
        <label className="text-[10px] opacity-50 block mb-1">Test Script</label>
        <textarea
          className="input-field w-full h-28 font-mono text-[11px] resize-y"
          placeholder={'// Runs after the response is received\n// Available: request, response, environment, console'}
          value={testScript}
          onChange={(e) => setTestScript(e.target.value)}
        />
      </div>
    </div>
  );
}
