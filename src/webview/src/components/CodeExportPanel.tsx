import React, { useMemo } from 'react';
import { useRequestStore } from '../stores/requestStore';
import { useAppStore } from '../stores/appStore';
import { generateCode, CodeLanguage } from '../utils/codeGen';
import { Copy } from 'lucide-react';

type TokenType = 'keyword' | 'string' | 'number' | 'comment' | 'function' | 'type' | 'variable' | 'operator' | 'punctuation' | 'plain';

const TOKEN_COLORS: Record<TokenType, string> = {
  keyword: '#c586c0', string: '#ce9178', number: '#b5cea8', comment: '#6a9955',
  function: '#dcdcaa', type: '#4ec9b0', variable: '#9cdcfe', operator: '#d4d4d4',
  punctuation: '#808080', plain: 'inherit',
};

const KEYWORDS: Record<string, Set<string>> = {
  curl: new Set(['curl']),
  javascript: new Set(['const', 'let', 'var', 'await', 'async', 'function', 'return', 'import', 'from', 'new', 'true', 'false', 'null', 'undefined']),
  python: new Set(['import', 'from', 'def', 'return', 'True', 'False', 'None', 'print', 'as', 'with']),
  go: new Set(['package', 'import', 'func', 'main', 'var', 'defer', 'nil', 'true', 'false']),
  java: new Set(['import', 'var', 'new', 'public', 'static', 'void', 'class', 'return', 'true', 'false', 'null']),
  csharp: new Set(['using', 'var', 'new', 'await', 'async', 'true', 'false', 'null']),
  ruby: new Set(['require', 'puts', 'do', 'end', 'true', 'false', 'nil']),
  php: new Set(['curl_init', 'curl_setopt', 'curl_exec', 'curl_close', 'echo', 'true', 'false', 'null']),
  rust: new Set(['use', 'async', 'fn', 'main', 'let', 'await', 'Ok', 'true', 'false']),
  swift: new Set(['import', 'let', 'var', 'try', 'await', 'true', 'false', 'nil']),
};

function getLangFamily(lang: CodeLanguage): string {
  if (lang.startsWith('javascript')) return 'javascript';
  if (lang.startsWith('python')) return 'python';
  return lang;
}

function highlightCode(code: string, lang: CodeLanguage): React.ReactNode[] {
  const family = getLangFamily(lang);
  const kw = KEYWORDS[family] || new Set();
  const lines = code.split('\n');

  return lines.map((line, li) => {
    const nodes: React.ReactNode[] = [];
    if (/^\s*(#|\/\/)/.test(line)) {
      nodes.push(<span key={0} style={{ color: TOKEN_COLORS.comment }}>{line}</span>);
    } else {
      const regex = /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)|(-?\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b)|(\b[a-zA-Z_]\w*\b)|([{}()\[\];,.:=<>!&|?+\-*/\\@$^~%])/g;
      let last = 0;
      let m: RegExpExecArray | null;
      while ((m = regex.exec(line)) !== null) {
        if (m.index > last) nodes.push(line.slice(last, m.index));
        if (m[1]) {
          nodes.push(<span key={m.index} style={{ color: TOKEN_COLORS.string }}>{m[0]}</span>);
        } else if (m[2]) {
          nodes.push(<span key={m.index} style={{ color: TOKEN_COLORS.number }}>{m[0]}</span>);
        } else if (m[3]) {
          const word = m[0];
          if (kw.has(word)) nodes.push(<span key={m.index} style={{ color: TOKEN_COLORS.keyword }}>{word}</span>);
          else if (/^[A-Z]/.test(word)) nodes.push(<span key={m.index} style={{ color: TOKEN_COLORS.type }}>{word}</span>);
          else nodes.push(<span key={m.index} style={{ color: TOKEN_COLORS.variable }}>{word}</span>);
        } else {
          nodes.push(<span key={m.index} style={{ color: TOKEN_COLORS.punctuation }}>{m[0]}</span>);
        }
        last = m.index + m[0].length;
      }
      if (last < line.length) nodes.push(line.slice(last));
    }
    return <React.Fragment key={li}>{nodes}{li < lines.length - 1 ? '\n' : ''}</React.Fragment>;
  });
}

export function CodeExportPanel({ lang }: { lang: CodeLanguage }) {
  const toApiRequest = useRequestStore((s) => s.toApiRequest);
  const response = useAppStore((s) => s.response);
  const addToast = useAppStore((s) => s.addToast);

  // Subscribe to all request fields that affect code generation
  const url = useRequestStore((s) => s.url);
  const method = useRequestStore((s) => s.method);
  const headers = useRequestStore((s) => s.headers);
  const params = useRequestStore((s) => s.params);
  const body = useRequestStore((s) => s.body);
  const auth = useRequestStore((s) => s.auth);

  const code = useMemo(() => generateCode(toApiRequest(), lang, response), [lang, response, url, method, headers, params, body, auth]);
  const highlighted = useMemo(() => highlightCode(code, lang), [code, lang]);

  const copy = () => {
    navigator.clipboard.writeText(code);
    addToast({ type: 'info', message: 'Copied to clipboard' });
  };

  return (
    <div className="relative group rounded" style={{ background: 'var(--vsc-input-bg)' }}>
      <button
        onClick={copy}
        className="absolute top-2 right-2 p-1 rounded opacity-0 group-hover:opacity-70 hover:!opacity-100 transition-opacity z-10"
        style={{ background: 'var(--vsc-btn-bg)', color: 'var(--vsc-btn-fg)' }}
        title="Copy code"
      >
        <Copy size={12} />
      </button>
      <pre className="p-3 text-[11px] font-mono leading-relaxed whitespace-pre-wrap break-all">
        {highlighted}
      </pre>
    </div>
  );
}
