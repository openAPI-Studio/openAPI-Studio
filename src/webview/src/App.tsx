import React, { useEffect, useRef, useState } from 'react';
import { Zap, Settings } from 'lucide-react';
import { RequestBuilder } from './components/RequestBuilder';
import { ResponseViewer } from './components/ResponseViewer';
import { Sidebar } from './components/Sidebar';
import { EnvironmentSelector } from './components/EnvironmentSelector';
import { ResizableSplit } from './components/ResizableSplit';
import { ToastContainer } from './components/ToastContainer';
import { ConfirmDialog } from './components/ConfirmDialog';
import { TabBar } from './components/TabBar';
import { useAppStore } from './stores/appStore';
import { useRequestStore } from './stores/requestStore';
import { useTabStore } from './stores/tabStore';
import { onMessage, postMessage, ApiRequest, ApiResponse, CookieEntry } from './types/messages';

class WebviewErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; message: string }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error?.message || 'Unknown UI error' };
  }

  componentDidCatch(error: Error) {
    console.error('Open Post render crash', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-full flex items-center justify-center p-4" style={{ background: 'var(--vsc-editor-bg)', color: 'var(--vsc-foreground)' }}>
          <div className="max-w-lg w-full rounded p-4" style={{ border: '1px solid var(--vsc-border-visible)', background: 'var(--vsc-input-bg)' }}>
            <p className="text-sm font-semibold mb-2">Open Post UI recovered from a runtime error</p>
            <p className="text-xs opacity-70 mb-3">{this.state.message}</p>
            <p className="text-xs opacity-70">Close and reopen the Open Post panel, or run <strong>Developer: Reload Window</strong>.</p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const setResponse = useAppStore((s) => s.setResponse);
  const setLoading = useAppStore((s) => s.setLoading);
  const setError = useAppStore((s) => s.setError);
  const setEnvironments = useAppStore((s) => s.setEnvironments);
  const setActiveEnvironmentId = useAppStore((s) => s.setActiveEnvironmentId);
  const setCollections = useAppStore((s) => s.setCollections);
  const setHistory = useAppStore((s) => s.setHistory);
  const addToast = useAppStore((s) => s.addToast);
  const showConfirm = useAppStore((s) => s.showConfirm);
  const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed);
  const sidebarWidth = useAppStore((s) => s.sidebarWidth);
  const setSidebarWidth = useAppStore((s) => s.setSidebarWidth);
  const sslVerification = useAppStore((s) => s.sslVerification);
  const setSslVerification = useAppStore((s) => s.setSslVerification);
  const cookiesEnabled = useAppStore((s) => s.cookiesEnabled);
  const setCookiesEnabled = useAppStore((s) => s.setCookiesEnabled);
  const tabViewCollapsed = useAppStore((s) => s.tabViewCollapsed);
  const setTabViewCollapsed = useAppStore((s) => s.setTabViewCollapsed);
  const tabGrouping = useAppStore((s) => s.tabGrouping);
  const setTabGrouping = useAppStore((s) => s.setTabGrouping);
  const allCookies = useAppStore((s) => s.allCookies);
  const [showSettings, setShowSettings] = useState(false);
  const [showCookieManager, setShowCookieManager] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (showSettings && settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setShowSettings(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showSettings]);

  useEffect(() => {
    onMessage((msg: unknown) => {
      try {
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
          case 'snapshots':
            useAppStore.getState().setSnapshots(m.data as ReturnType<typeof useAppStore.getState>['snapshots']);
            break;
          case 'contractVariantPrompt': {
            const prompt = m.data as { promptId: string; status: number; summary: string };
            showConfirm({
              title: 'New Response Type',
              message: `Status ${prompt.status} returned a new JSON structure. Save as a new contract type?`,
              confirmText: 'Save Type',
              cancelText: 'Skip',
              onConfirm: () => {
                postMessage({ type: 'resolveContractVariantPrompt', promptId: prompt.promptId, save: true });
                addToast({ type: 'info', message: 'New response type saved to contract' });
              },
              onCancel: () => {
                postMessage({ type: 'resolveContractVariantPrompt', promptId: prompt.promptId, save: false });
                addToast({ type: 'info', message: 'Skipped saving new response type' });
              },
            });
            break;
          }
          case 'loadRequest': {
            const msg2 = m as { data: ApiRequest; collectionId?: string | null; response?: ApiResponse | null };
            useTabStore.getState().openRequest(
              msg2.data,
              msg2.collectionId,
              undefined,
              msg2.response ?? null,
            );
            break;
          }
          case 'cookies':
            useAppStore.getState().setAllCookies(m.data as CookieEntry[]);
            break;
          case 'tabSettings': {
            const ts = (m as any).data;
            useAppStore.getState().setTabViewCollapsed(ts.tabViewCollapsed);
            useAppStore.getState().setTabGrouping(ts.tabGrouping);
            break;
          }
        }
      } catch (err) {
        console.error('Open Post message handling error', err);
        setLoading(false);
        addToast({ type: 'error', message: 'UI runtime error handled. Please retry request.' });
      }
    });

    postMessage({ type: 'loadCollections' });
    postMessage({ type: 'loadEnvironments' });
    postMessage({ type: 'loadHistory' });
    postMessage({ type: 'loadCookies' });
    postMessage({ type: 'loadTabSettings' });
    postMessage({ type: 'loadSnapshots' });
  }, []);

  return (
    <WebviewErrorBoundary>
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-3 py-1.5 shrink-0" style={{ borderBottom: '1px solid var(--vsc-border-visible)' }}>
        <span className="text-xs font-semibold flex items-center gap-1.5 opacity-80">
          <Zap size={12} /> Open Post
        </span>
        <div className="flex items-center gap-2">
          <EnvironmentSelector />
          <div className="relative" ref={settingsRef}>
            <button
              className="opacity-50 hover:opacity-100 transition-opacity"
              onClick={() => setShowSettings(!showSettings)}
              title="Settings"
            >
              <Settings size={13} />
            </button>
            {showSettings && (
              <div
                className="absolute right-0 top-full mt-1 z-50 rounded text-[11px] min-w-[180px] py-1"
                style={{ background: 'var(--vsc-input-bg)', border: '1px solid var(--vsc-border-visible)' }}
              >
                <label className="flex items-center gap-2 cursor-pointer px-2.5 py-1.5 hover:opacity-80">
                  <input
                    type="checkbox"
                    checked={sslVerification}
                    onChange={(e) => setSslVerification(e.target.checked)}
                  />
                  SSL Verification
                </label>
                <label className="flex items-center gap-2 cursor-pointer px-2.5 py-1.5 hover:opacity-80">
                  <input
                    type="checkbox"
                    checked={cookiesEnabled}
                    onChange={(e) => {
                      setCookiesEnabled(e.target.checked);
                      postMessage({ type: 'setCookiesEnabled', enabled: e.target.checked });
                    }}
                  />
                  Cookies Enabled
                </label>
                <label className="flex items-center gap-2 cursor-pointer px-2.5 py-1.5 hover:opacity-80">
                  <input
                    type="checkbox"
                    checked={tabViewCollapsed}
                    onChange={(e) => {
                      setTabViewCollapsed(e.target.checked);
                      postMessage({ type: 'setTabSetting', key: 'tabViewCollapsed', value: e.target.checked });
                    }}
                  />
                  Collapsed Tabs
                </label>
                <label className="flex items-center gap-2 cursor-pointer px-2.5 py-1.5 hover:opacity-80">
                  <input
                    type="checkbox"
                    checked={tabGrouping}
                    onChange={(e) => {
                      setTabGrouping(e.target.checked);
                      postMessage({ type: 'setTabSetting', key: 'tabGrouping', value: e.target.checked });
                    }}
                  />
                  Grouped Tabs
                </label>
                <div style={{ borderTop: '1px solid var(--vsc-border-visible)', margin: '2px 0' }} />
                <button
                  className="w-full text-left px-2.5 py-1.5 hover:opacity-80"
                  onClick={() => { setShowSettings(false); setShowCookieManager(true); }}
                >
                  Manage Cookies ({allCookies.length})
                </button>
                <div style={{ borderTop: '1px solid var(--vsc-border-visible)', margin: '2px 0' }} />
                <button
                  className="w-full text-left px-2.5 py-1.5 hover:opacity-80"
                  onClick={() => {
                    setShowSettings(false);
                    useAppStore.getState().showConfirm({
                      title: 'Clear History',
                      message: 'Delete all request history? This cannot be undone.',
                      onConfirm: () => postMessage({ type: 'clearHistory' }),
                    });
                  }}
                >
                  Clear All History
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main: Sidebar + Split */}
      <div className="flex flex-1 overflow-hidden">
        <div className="shrink-0 h-full overflow-hidden" style={{ width: sidebarCollapsed ? 'auto' : `${sidebarWidth}px`, borderRight: sidebarCollapsed ? '1px solid var(--vsc-border-visible)' : 'none' }}>
          <Sidebar />
        </div>
        {!sidebarCollapsed && (
          <div
            className="shrink-0 w-[3px] cursor-col-resize hover:bg-vsc-btn-bg active:bg-vsc-btn-bg transition-colors"
            style={{ background: 'var(--vsc-border-visible)' }}
            onMouseDown={(e) => {
              e.preventDefault();
              const startX = e.clientX;
              const startW = sidebarWidth;
              document.body.style.cursor = 'col-resize';
              document.body.style.userSelect = 'none';
              const onMove = (ev: MouseEvent) => {
                setSidebarWidth(Math.max(140, Math.min(400, startW + ev.clientX - startX)));
              };
              const onUp = () => {
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onUp);
              };
              document.addEventListener('mousemove', onMove);
              document.addEventListener('mouseup', onUp);
            }}
            onDoubleClick={() => setSidebarWidth(220)}
          />
        )}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          <TabBar />
          <ResizableSplit
            top={
              <div className="h-full p-3 flex flex-col overflow-hidden">
                <RequestBuilder />
              </div>
            }
            bottom={
              <div className="h-full p-3 overflow-auto">
                <ResponseViewer />
              </div>
            }
          />
        </div>
      </div>

      <ToastContainer />
      <ConfirmDialog />

      {/* Cookie Manager Modal */}
      {showCookieManager && (
        <>
          <div className="fixed inset-0 z-50 bg-black/40" onClick={() => setShowCookieManager(false)} />
          <div
            className="fixed inset-x-4 top-8 bottom-8 z-50 mx-auto max-w-[600px] rounded-lg flex flex-col overflow-hidden"
            style={{ background: 'var(--vsc-editor-bg)', border: '1px solid var(--vsc-border-visible)' }}
          >
            <div className="flex items-center justify-between px-4 py-2.5 shrink-0" style={{ borderBottom: '1px solid var(--vsc-border-visible)' }}>
              <span className="text-xs font-semibold">Cookie Manager ({allCookies.length})</span>
              <div className="flex items-center gap-2">
                <button
                  className="text-[11px] opacity-60 hover:opacity-100 px-2 py-0.5 rounded"
                  style={{ background: 'var(--vsc-error)' , color: '#000' }}
                  onClick={() => {
                    useAppStore.getState().showConfirm({
                      title: 'Clear All Cookies',
                      message: 'Delete all stored cookies? This cannot be undone.',
                      onConfirm: () => postMessage({ type: 'clearCookies' }),
                    });
                  }}
                >Clear All</button>
                <button className="opacity-50 hover:opacity-100" onClick={() => setShowCookieManager(false)}>✕</button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-3">
              {allCookies.length === 0 ? (
                <p className="text-[11px] opacity-30 text-center py-8">No cookies stored</p>
              ) : (
                Object.entries(
                  allCookies.reduce<Record<string, typeof allCookies>>((acc, c) => {
                    (acc[c.domain] = acc[c.domain] || []).push(c);
                    return acc;
                  }, {})
                ).map(([domain, cookies]) => (
                  <div key={domain} className="mb-3">
                    <div className="text-[11px] font-semibold opacity-60 mb-1 flex items-center gap-1">
                      <span>🌐</span> {domain}
                      <span className="opacity-40 font-normal">({cookies.length})</span>
                    </div>
                    {cookies.map((c, i) => (
                      <div
                        key={`${c.name}-${c.path}-${i}`}
                        className="flex items-center gap-2 px-2 py-1.5 text-[11px] font-mono group rounded"
                        style={{ borderBottom: '1px solid rgba(128,128,128,0.1)' }}
                      >
                        <span className="w-[25%] shrink-0 truncate font-medium opacity-70" title={c.name}>{c.name}</span>
                        <span className="w-[30%] shrink-0 truncate opacity-40" title={c.value}>{c.value}</span>
                        <span className="w-[10%] shrink-0 truncate opacity-40">{c.path}</span>
                        <span className="w-[20%] shrink-0 truncate opacity-40">{c.expires ? new Date(c.expires).toLocaleDateString() : 'Session'}</span>
                        <div className="w-[10%] flex gap-1">
                          {c.httpOnly && <span className="text-[8px] opacity-40">HO</span>}
                          {c.secure && <span className="text-[8px] opacity-40">S</span>}
                        </div>
                        <button
                          className="opacity-0 group-hover:opacity-60 hover:!opacity-100 shrink-0"
                          onClick={() => postMessage({ type: 'deleteCookie', domain: c.domain, name: c.name, path: c.path })}
                          title="Delete cookie"
                        >✕</button>
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
    </WebviewErrorBoundary>
  );
}
