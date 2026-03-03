import React from 'react';
import { useAppStore } from '../stores/appStore';
import { postMessage, Environment } from '../types/messages';

export function EnvironmentSelector() {
  const environments = useAppStore((s) => s.environments);
  const activeEnvironmentId = useAppStore((s) => s.activeEnvironmentId);

  return (
    <select
      className="px-2 py-1 rounded text-xs"
      style={{ background: 'var(--input-bg)', color: 'var(--input-fg)', border: '1px solid var(--input-border)' }}
      value={activeEnvironmentId || ''}
      onChange={(e) => postMessage({ type: 'setActiveEnvironment', id: e.target.value || null })}
    >
      <option value="">No Environment</option>
      {environments.map((env) => (
        <option key={env.id} value={env.id}>{env.name}</option>
      ))}
    </select>
  );
}
