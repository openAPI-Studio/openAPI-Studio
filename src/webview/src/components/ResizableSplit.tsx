import React, { useCallback, useRef, useEffect } from 'react';
import { useAppStore } from '../stores/appStore';

export function ResizableSplit({ top, bottom }: { top: React.ReactNode; bottom: React.ReactNode }) {
  const ratio = useAppStore((s) => s.splitRatio);
  const setRatio = useAppStore((s) => s.setSplitRatio);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const r = Math.max(0.15, Math.min(0.85, (e.clientY - rect.top) / rect.height));
      setRatio(r);
    };
    const onUp = () => {
      dragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
  }, [setRatio]);

  return (
    <div ref={containerRef} className="flex flex-col flex-1 overflow-hidden">
      <div className="overflow-auto" style={{ flexBasis: `${ratio * 100}%`, minHeight: 0 }}>
        {top}
      </div>
      <div
        className="shrink-0 h-1 cursor-row-resize transition-colors duration-150 hover:bg-vsc-sash-hover relative"
        style={{ background: 'var(--vsc-border-visible, var(--vsc-border))' }}
        onMouseDown={onMouseDown}
        onDoubleClick={() => setRatio(0.5)}
        title="Drag to resize, double-click to reset"
      >
        <div className="absolute inset-x-0 -top-1 -bottom-1" />
      </div>
      <div className="overflow-auto flex-1" style={{ minHeight: 0 }}>
        {bottom}
      </div>
    </div>
  );
}
