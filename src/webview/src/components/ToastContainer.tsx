import React, { useEffect } from 'react';
import { useAppStore } from '../stores/appStore';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

const icons = { success: CheckCircle, error: AlertCircle, info: Info };
const colors = { success: 'var(--vsc-success)', error: 'var(--vsc-error)', info: 'var(--vsc-info)' };

export function ToastContainer() {
  const toasts = useAppStore((s) => s.toasts);
  const removeToast = useAppStore((s) => s.removeToast);

  return (
    <div className="fixed bottom-3 right-3 flex flex-col gap-2 z-50 pointer-events-none" style={{ maxWidth: 320 }}>
      {toasts.map((t) => (
        <ToastItem key={t.id} id={t.id} type={t.type} message={t.message} duration={t.duration} onDismiss={removeToast} />
      ))}
    </div>
  );
}

function ToastItem({ id, type, message, duration = 3000, onDismiss }: {
  id: string; type: 'success' | 'error' | 'info'; message: string; duration?: number; onDismiss: (id: string) => void;
}) {
  const Icon = icons[type];

  useEffect(() => {
    const timer = setTimeout(() => onDismiss(id), duration);
    return () => clearTimeout(timer);
  }, [id, duration, onDismiss]);

  return (
    <div
      className="flex items-start gap-2 px-3 py-2.5 rounded shadow-vsc animate-slide-in pointer-events-auto text-xs"
      style={{ background: 'var(--vsc-notify-bg)', color: 'var(--vsc-notify-fg)', border: '1px solid var(--vsc-notify-border)' }}
    >
      <Icon size={14} style={{ color: colors[type], marginTop: 1 }} className="shrink-0" />
      <span className="flex-1 leading-relaxed">{message}</span>
      <button onClick={() => onDismiss(id)} className="btn-ghost p-0.5 shrink-0 opacity-50 hover:opacity-100">
        <X size={12} />
      </button>
    </div>
  );
}
