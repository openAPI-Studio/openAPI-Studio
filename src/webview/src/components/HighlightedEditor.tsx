import React, { useRef } from 'react';

const KEYWORDS = new Set(['const', 'let', 'var', 'if', 'else', 'return', 'function', 'true', 'false', 'null', 'undefined', 'typeof', 'new', 'this', 'for', 'while', 'of', 'in']);

const COLORS = {
  keyword: '#c586c0',
  string: '#ce9178',
  number: '#b5cea8',
  comment: '#6a9955',
  property: '#9cdcfe',
  method: '#dcdcaa',
  punctuation: '#808080',
};

function highlight(code: string): React.ReactNode[] {
  return code.split('\n').map((line, li) => {
    const nodes: React.ReactNode[] = [];
    if (/^\s*\/\//.test(line)) {
      nodes.push(<span key={0} style={{ color: COLORS.comment }}>{line}</span>);
    } else {
      const re = /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)|(-?\b\d+(?:\.\d+)?\b)|(\b[a-zA-Z_]\w*)\s*(?=\()|\.(\w+)(?=\s*(?:\(|$|[^(]))|(\b[a-zA-Z_]\w*\b)|([{}()\[\];,.:=<>!&|?+\-*/])/g;
      let last = 0;
      let m: RegExpExecArray | null;
      while ((m = re.exec(line)) !== null) {
        if (m.index > last) nodes.push(line.slice(last, m.index));
        if (m[1]) nodes.push(<span key={m.index} style={{ color: COLORS.string }}>{m[0]}</span>);
        else if (m[2]) nodes.push(<span key={m.index} style={{ color: COLORS.number }}>{m[0]}</span>);
        else if (m[3]) nodes.push(<span key={m.index} style={{ color: COLORS.method }}>{m[0]}</span>);
        else if (m[4]) nodes.push(<span key={m.index} style={{ color: COLORS.property }}>.{m[4]}</span>);
        else if (m[5]) {
          const color = KEYWORDS.has(m[5]) ? COLORS.keyword : COLORS.property;
          nodes.push(<span key={m.index} style={{ color }}>{m[5]}</span>);
        } else nodes.push(<span key={m.index} style={{ color: COLORS.punctuation }}>{m[0]}</span>);
        last = m.index + m[0].length;
      }
      if (last < line.length) nodes.push(line.slice(last));
    }
    return <React.Fragment key={li}>{nodes}{li < code.split('\n').length - 1 ? '\n' : ''}</React.Fragment>;
  });
}

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}

export function HighlightedEditor({ value, onChange, placeholder, className }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);

  const syncScroll = () => {
    if (textareaRef.current && preRef.current) {
      preRef.current.scrollTop = textareaRef.current.scrollTop;
      preRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };

  return (
    <div className={`relative ${className || ''}`} style={{ minHeight: '7rem' }}>
      <pre
        ref={preRef}
        className="absolute inset-0 p-2 font-mono text-[11px] leading-relaxed overflow-hidden whitespace-pre-wrap break-all pointer-events-none m-0 rounded"
        style={{ background: 'var(--vsc-input-bg)', border: '1px solid transparent' }}
        aria-hidden
      >
        {value ? highlight(value) : <span className="opacity-30">{placeholder}</span>}
        {'\n'}
      </pre>
      <textarea
        ref={textareaRef}
        className="absolute inset-0 p-2 font-mono text-[11px] leading-relaxed resize-y w-full h-full rounded"
        style={{ background: 'transparent', color: 'transparent', caretColor: 'var(--vscode-editor-foreground, #d4d4d4)', border: '1px solid var(--vsc-border-visible)', outline: 'none' }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={syncScroll}
        spellCheck={false}
      />
    </div>
  );
}
