import React from 'react';
import { useAppStore } from '../stores/appStore';
import { postMessage } from '../types/messages';
import { Globe } from 'lucide-react';

export function EnvironmentSelector() {
  const environments = useAppStore((s) => s.environments);
  const activeEnvironmentId = useAppStore((s) => s.activeEnvironmentId);

  return (
    <div className="flex items-center gap-1.5">
      <Globe size={11} className="opacity-40" />
      <select
        className="select-field text-[11px] py-0.5"
        value={activeEnvironmentId || ''}
        onChange={(e) => postMessage({ type: 'setActiveEnvironment', id: e.target.value || null })}
      >
        <option value="">No Environment</option>
        {environments.map((env) => (
          <option key={env.id} value={env.id}>{env.name}</option>
        ))}
      </select>
    </div>
  );
}
