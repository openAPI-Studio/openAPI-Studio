import { create } from 'zustand';
import { ApiResponse, Environment, Collection, HistoryEntry } from '../types/messages';

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
  responseTab: 'body' | 'headers';
  bodyViewMode: 'pretty' | 'raw' | 'tree';
  sidebarTab: 'collections' | 'environments' | 'history';
  sidebarCollapsed: boolean;
  sidebarWidth: number;
  sidebarSearch: string;
  splitRatio: number;
  showCodePanel: boolean;
  codePanelRatio: number;
  sslVerification: boolean;
  toasts: Toast[];
  confirmDialog: ConfirmDialog | null;
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
  addToast: (t: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  showConfirm: (d: ConfirmDialog) => void;
  hideConfirm: () => void;
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
  toasts: [],
  confirmDialog: null,
  setResponse: (response) => set({ response, error: null, viewedHistoryId: null }),
  setViewedHistoryId: (viewedHistoryId) => set({ viewedHistoryId }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
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
  addToast: (t) => {
    const id = Date.now().toString() + Math.random().toString(36).slice(2);
    set((s) => ({ toasts: [...s.toasts, { ...t, id }] }));
  },
  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  showConfirm: (confirmDialog) => set({ confirmDialog }),
  hideConfirm: () => set({ confirmDialog: null }),
}));
