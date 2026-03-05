import React, { useMemo } from 'react';
import { useRequestStore } from '../stores/requestStore';
import { useAppStore } from '../stores/appStore';
import { generatePrompt, PromptDialect, PROMPT_DIALECTS } from '../utils/promptGen';
import { Copy } from 'lucide-react';

export function AIPromptPanel({ dialect }: { dialect: PromptDialect }) {
  const reqState = useRequestStore();
  const response = useAppStore((s) => s.response);
  const addToast = useAppStore((s) => s.addToast);
  const environments = useAppStore((s) => s.environments);
  const activeEnvironmentId = useAppStore((s) => s.activeEnvironmentId);

  const envVars = useMemo(() => {
    const env = environments.find(e => e.id === activeEnvironmentId);
    if (!env) return {};
    const vars: Record<string, string> = {};
    for (const v of env.variables.filter(v => v.enabled && v.key)) vars[v.key] = v.value;
    return vars;
  }, [environments, activeEnvironmentId]);

  const prompt = useMemo(() => {
    try {
      return generatePrompt(reqState.toApiRequest(), dialect, response, envVars);
    } catch {
      return '// Error generating prompt';
    }
  }, [dialect, response, envVars, reqState.url, reqState.method, reqState.headers, reqState.params, reqState.body, reqState.auth]);

  const copy = () => {
    navigator.clipboard.writeText(prompt);
    addToast({ type: 'info', message: 'Prompt copied to clipboard' });
  };

  return (
    <div className="relative group rounded" style={{ background: 'var(--vsc-input-bg)' }}>
      <button
        onClick={copy}
        className="absolute top-2 right-2 p-1 rounded opacity-0 group-hover:opacity-70 hover:!opacity-100 transition-opacity z-10"
        style={{ background: 'var(--vsc-btn-bg)', color: 'var(--vsc-btn-fg)' }}
        title="Copy prompt"
      >
        <Copy size={12} />
      </button>
      <pre className="p-3 text-[11px] font-mono leading-relaxed whitespace-pre-wrap break-all">
        {prompt}
      </pre>
    </div>
  );
}
