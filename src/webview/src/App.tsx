import React, { useEffect } from 'react';
import { RequestBuilder } from './components/RequestBuilder';
import { ResponseViewer } from './components/ResponseViewer';
import { Sidebar } from './components/Sidebar';
import { EnvironmentSelector } from './components/EnvironmentSelector';
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

  useEffect(() => {
    onMessage((msg: unknown) => {
      const m = msg as { type: string; data?: unknown; message?: string; id?: string | null };
      switch (m.type) {
        case 'response':
          setLoading(false);
          setResponse(m.data as ReturnType<typeof useAppStore.getState>['response']);
          break;
        case 'error':
          setLoading(false);
          setError(m.message || 'Unknown error');
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
          useRequestStore.getState().loadRequest(m.data as ApiRequest);
          break;
      }
    });

    // Load initial data
    postMessage({ type: 'loadCollections' });
    postMessage({ type: 'loadEnvironments' });
    postMessage({ type: 'loadHistory' });
  }, []);

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className="w-64 shrink-0 overflow-hidden">
        <Sidebar />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-2 border-b" style={{ borderColor: 'var(--border)' }}>
          <span className="text-sm font-bold">⚡ Open Post</span>
          <EnvironmentSelector />
        </div>

        {/* Request + Response */}
        <div className="flex-1 overflow-auto p-4 flex flex-col gap-4">
          <RequestBuilder />
          <div className="border-t pt-4" style={{ borderColor: 'var(--border)' }}>
            <ResponseViewer />
          </div>
        </div>
      </div>
    </div>
  );
}
