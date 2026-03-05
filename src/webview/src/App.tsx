import React, { useEffect } from 'react';
import { Zap } from 'lucide-react';
import { RequestBuilder } from './components/RequestBuilder';
import { ResponseViewer } from './components/ResponseViewer';
import { EnvironmentSelector } from './components/EnvironmentSelector';
import { ResizableSplit } from './components/ResizableSplit';
import { ToastContainer } from './components/ToastContainer';
import { ConfirmDialog } from './components/ConfirmDialog';
import { useAppStore } from './stores/appStore';
import { useRequestStore } from './stores/requestStore';
import { onMessage, postMessage, ApiRequest } from './types/messages';

export default function App() {
  const setResponse = useAppStore((s) => s.setResponse);
  const setLoading = useAppStore((s) => s.setLoading);
  const setError = useAppStore((s) => s.setError);
  const setEnvironments = useAppStore((s) => s.setEnvironments);
  const setActiveEnvironmentId = useAppStore((s) => s.setActiveEnvironmentId);
  const setCollections = useAppStore((s) => s.setCollections);
  const setHistory = useAppStore((s) => s.setHistory);
  const addToast = useAppStore((s) => s.addToast);

  useEffect(() => {
    onMessage((msg: unknown) => {
      const m = msg as { type: string; data?: unknown; message?: string; id?: string | null };
      switch (m.type) {
        case 'response':
          setLoading(false);
          setResponse(m.data as ReturnType<typeof useAppStore.getState>['response']);
          addToast({ type: 'success', message: 'Request completed' });
          break;
        case 'error':
          setLoading(false);
          setError(m.message || 'Unknown error');
          addToast({ type: 'error', message: m.message || 'Request failed' });
          break;
        case 'environments':
          setEnvironments(m.data as ReturnType<typeof useAppStore.getState>['environments']);
          break;
        case 'activeEnvironment':
          setActiveEnvironmentId((m.id as string) || null);
          break;
        case 'collections':
          setCollections(m.data as ReturnType<typeof useAppStore.getState>['collections']);
          break;
        case 'history':
          setHistory(m.data as ReturnType<typeof useAppStore.getState>['history']);
          break;
        case 'loadRequest':
          useRequestStore.getState().loadRequest(
            m.data as ApiRequest,
            (m as { collectionId?: string | null }).collectionId,
          );
          break;
      }
    });

    postMessage({ type: 'loadCollections' });
    postMessage({ type: 'loadEnvironments' });
    postMessage({ type: 'loadHistory' });
  }, []);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-3 py-1.5 shrink-0" style={{ borderBottom: '1px solid var(--vsc-border-visible)' }}>
        <span className="text-xs font-semibold flex items-center gap-1.5 opacity-80">
          <Zap size={12} /> Open Post
        </span>
        <EnvironmentSelector />
      </div>

      {/* Main split: Request (top) | Response (bottom) */}
      <ResizableSplit
        top={
          <div className="h-full p-3 overflow-auto">
            <RequestBuilder />
          </div>
        }
        bottom={
          <div className="h-full p-3 overflow-auto">
            <ResponseViewer />
          </div>
        }
      />

      <ToastContainer />
      <ConfirmDialog />
    </div>
  );
}
