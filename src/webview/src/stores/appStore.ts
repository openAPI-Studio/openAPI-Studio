import { create } from 'zustand';
import { ApiResponse, Environment, Collection, HistoryEntry, CookieEntry, Snapshot, SnapshotRecord, ContractVariantPrompt } from '../types/messages';
import { useTabStore } from './tabStore';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
  duration?: number;
}

export interface ConfirmDialog {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
}

interface AppState {
  response: ApiResponse | null;
  viewedHistoryId: string | null;
  loading: boolean;
  error: string | null;
  environments: Environment[];
  activeEnvironmentId: string | null;
  collections: Collection[];
  history: HistoryEntry[];
  responseTab: 'body' | 'headers' | 'cookies' | 'tests';
  bodyViewMode: 'pretty' | 'raw' | 'tree';
  sidebarTab: 'collections' | 'environments' | 'history' | 'snapshots';
  sidebarCollapsed: boolean;
  sidebarWidth: number;
  sidebarSearch: string;
  splitRatio: number;
  showCodePanel: boolean;
  codePanelRatio: number;
  sslVerification: boolean;
  cookiesEnabled: boolean;
  tabViewCollapsed: boolean;
  tabGrouping: boolean;
  allCookies: CookieEntry[];
  toasts: Toast[];
  confirmDialog: ConfirmDialog | null;
  snapshots: Snapshot[];
  viewedSnapshotRecord: { snapshotId: string; record: SnapshotRecord } | null;
  subtleContracts: boolean;
  pendingContractPrompt: ContractVariantPrompt | null;
  globalCollections: Collection[];
  globalEnvironments: Environment[];
  globalHistory: HistoryEntry[];
  globalActiveEnvironmentId: string | null;
  setSubtleContracts: (v: boolean) => void;
  setPendingContractPrompt: (p: ContractVariantPrompt | null) => void;
  setResponse: (r: ApiResponse | null) => void;
  setViewedHistoryId: (id: string | null) => void;
  setLoading: (l: boolean) => void;
  setError: (e: string | null) => void;
  setEnvironments: (e: Environment[]) => void;
  setActiveEnvironmentId: (id: string | null) => void;
  setCollections: (c: Collection[]) => void;
  setHistory: (h: HistoryEntry[]) => void;
  setResponseTab: (t: AppState['responseTab']) => void;
  setBodyViewMode: (m: AppState['bodyViewMode']) => void;
  setSidebarTab: (t: AppState['sidebarTab']) => void;
  setSidebarCollapsed: (v: boolean) => void;
  setSidebarWidth: (v: number) => void;
  setSidebarSearch: (v: string) => void;
  setSplitRatio: (v: number) => void;
  setShowCodePanel: (v: boolean) => void;
  setCodePanelRatio: (v: number) => void;
  setSslVerification: (v: boolean) => void;
  setCookiesEnabled: (v: boolean) => void;
  setTabViewCollapsed: (v: boolean) => void;
  setTabGrouping: (v: boolean) => void;
  setAllCookies: (c: CookieEntry[]) => void;
  addToast: (t: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  showConfirm: (d: ConfirmDialog) => void;
  hideConfirm: () => void;
  setSnapshots: (s: Snapshot[]) => void;
  setViewedSnapshotRecord: (v: { snapshotId: string; record: SnapshotRecord } | null) => void;
  setGlobalCollections: (c: Collection[]) => void;
  setGlobalEnvironments: (e: Environment[]) => void;
  setGlobalHistory: (h: HistoryEntry[]) => void;
  setGlobalActiveEnvironmentId: (id: string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  response: null,
  viewedHistoryId: null,
  loading: false,
  error: null,
  environments: [],
  activeEnvironmentId: null,
  collections: [],
  history: [],
  responseTab: 'body',
  bodyViewMode: 'pretty',
  sidebarTab: 'collections',
  sidebarCollapsed: true,
  sidebarWidth: 220,
  sidebarSearch: '',
  splitRatio: 0.5,
  showCodePanel: false,
  codePanelRatio: 0.5,
  sslVerification: true,
  cookiesEnabled: true,
  tabViewCollapsed: false,
  tabGrouping: false,
  allCookies: [],
  toasts: [],
  confirmDialog: null,
  snapshots: [],
  viewedSnapshotRecord: null,
  subtleContracts: false,
  pendingContractPrompt: null,
  globalCollections: [],
  globalEnvironments: [],
  globalHistory: [],
  globalActiveEnvironmentId: null,
  setSubtleContracts: (subtleContracts) => set({ subtleContracts }),
  setPendingContractPrompt: (pendingContractPrompt) => set({ pendingContractPrompt }),
  setResponse: (response) => {
    const { activeTabId, updateTab } = useTabStore.getState();
    updateTab(activeTabId, { response, error: null });
    set({ response, error: null, viewedHistoryId: null });
  },
  setViewedHistoryId: (viewedHistoryId) => set({ viewedHistoryId }),
  setLoading: (loading) => {
    const { activeTabId, updateTab } = useTabStore.getState();
    updateTab(activeTabId, { loading });
    set({ loading });
  },
  setError: (error) => {
    const { activeTabId, updateTab } = useTabStore.getState();
    updateTab(activeTabId, { error });
    set({ error });
  },
  setEnvironments: (environments) => set({ environments }),
  setActiveEnvironmentId: (activeEnvironmentId) => set({ activeEnvironmentId }),
  setCollections: (collections) => set({ collections }),
  setHistory: (history) => set({ history }),
  setResponseTab: (responseTab) => set({ responseTab }),
  setBodyViewMode: (bodyViewMode) => set({ bodyViewMode }),
  setSidebarTab: (sidebarTab) => set({ sidebarTab }),
  setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
  setSidebarWidth: (sidebarWidth) => set({ sidebarWidth }),
  setSidebarSearch: (sidebarSearch) => set({ sidebarSearch }),
  setSplitRatio: (splitRatio) => set({ splitRatio }),
  setShowCodePanel: (showCodePanel) => set({ showCodePanel }),
  setCodePanelRatio: (codePanelRatio) => set({ codePanelRatio }),
  setSslVerification: (sslVerification) => set({ sslVerification }),
  setCookiesEnabled: (cookiesEnabled) => set({ cookiesEnabled }),
  setTabViewCollapsed: (tabViewCollapsed) => set({ tabViewCollapsed }),
  setTabGrouping: (tabGrouping) => set({ tabGrouping }),
  setAllCookies: (allCookies) => set({ allCookies }),
  addToast: (t) => {
    const id = Date.now().toString() + Math.random().toString(36).slice(2);
    set((s) => ({ toasts: [...s.toasts, { ...t, id }] }));
  },
  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  showConfirm: (confirmDialog) => set({ confirmDialog }),
  hideConfirm: () => set({ confirmDialog: null }),
  setSnapshots: (snapshots) => set({ snapshots }),
  setViewedSnapshotRecord: (viewedSnapshotRecord) => set({ viewedSnapshotRecord }),
  setGlobalCollections: (globalCollections) => set({ globalCollections }),
  setGlobalEnvironments: (globalEnvironments) => set({ globalEnvironments }),
  setGlobalHistory: (globalHistory) => set({ globalHistory }),
  setGlobalActiveEnvironmentId: (globalActiveEnvironmentId) => set({ globalActiveEnvironmentId }),
}));

// Sync response/loading/error from active tab when tab changes
useTabStore.subscribe((state, prev) => {
  if (state.activeTabId !== prev.activeTabId) {
    const tab = state.getActiveTab();
    useAppStore.setState({
      response: tab.response,
      loading: tab.loading,
      error: tab.error,
    });
  }
});
