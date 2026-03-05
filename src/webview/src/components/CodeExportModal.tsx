import React, { useState, useMemo } from 'react';
import { useRequestStore } from '../stores/requestStore';
import { useAppStore } from '../stores/appStore';
import { generateCode, LANGUAGES, CodeLanguage } from '../utils/codeGen';
import { Copy, X, Code } from 'lucide-react';

export function CodeExportModal({ onClose }: { onClose: () => void }) {
  const [lang, setLang] = useState<CodeLanguage>('curl');
  const toApiRequest = useRequestStore((s) => s.toApiRequest);
  const response = useAppStore((s) => s.response);
  const addToast = useAppStore((s) => s.addToast);

  const code = useMemo(() => generateCode(toApiRequest(), lang, response), [lang, toApiRequest, response]);

  const copy = () => {
    navigator.clipboard.writeText(code);
    addToast({ type: 'info', message: 'Code copied to clipboard' });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={onClose}>
      <div
        className="flex flex-col shadow-vsc rounded-md w-full max-w-2xl mx-4 max-h-[80vh]"
        style={{ background: 'var(--vsc-widget-bg)', border: '1px solid var(--vsc-widget-border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 shrink-0" style={{ borderBottom: '1px solid var(--vsc-border-visible)' }}>
          <div className="flex items-center gap-2">
            <Code size={14} className="opacity-60" />
            <span className="text-xs font-semibold">Export Code</span>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value as CodeLanguage)}
              className="select-field text-[11px] py-0.5"
            >
              {LANGUAGES.map((l) => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </select>
            <button onClick={copy} className="btn-ghost flex items-center gap-1 text-[11px]" title="Copy to clipboard">
              <Copy size={11} /> Copy
            </button>
            <button onClick={onClose} className="btn-ghost p-1" title="Close (Esc)">
              <X size={13} />
            </button>
          </div>
        </div>

        {/* Code */}
        <div className="flex-1 overflow-auto p-3">
          <pre className="text-[11px] font-mono leading-relaxed whitespace-pre-wrap break-all" style={{ color: 'var(--vsc-fg)' }}>
            {code}
          </pre>
        </div>
      </div>
    </div>
  );
}
