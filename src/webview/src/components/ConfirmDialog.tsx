import React, { useEffect } from 'react';
import { useAppStore } from '../stores/appStore';

export function ConfirmDialog() {
  const dialog = useAppStore((s) => s.confirmDialog);
  const hide = useAppStore((s) => s.hideConfirm);

  const closeWithCancel = React.useCallback(() => {
    dialog?.onCancel?.();
    hide();
  }, [dialog, hide]);

  useEffect(() => {
    if (!dialog) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') closeWithCancel(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [dialog, closeWithCancel]);

  if (!dialog) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={closeWithCancel}>
      <div
        className="flex flex-col gap-4 p-4 rounded-md shadow-vsc max-w-sm w-full mx-4"
        style={{ background: 'var(--vsc-widget-bg)', border: '1px solid var(--vsc-widget-border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-sm font-semibold" style={{ color: 'var(--vsc-widget-fg)' }}>{dialog.title}</h3>
        <p className="text-xs" style={{ color: 'var(--vsc-desc)' }}>{dialog.message}</p>
        <div className="flex justify-end gap-2">
          <button onClick={closeWithCancel} className="btn-secondary">{dialog.cancelText || 'Cancel'} <span className="opacity-40 ml-1 text-[10px]">Esc</span></button>
          <button onClick={() => { dialog.onConfirm(); hide(); }} className="btn-primary" style={{ background: 'var(--vsc-error)' }}>{dialog.confirmText || 'Delete'}</button>
        </div>
      </div>
    </div>
  );
}
