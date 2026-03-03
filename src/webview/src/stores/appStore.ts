import { create } from 'zustand';
import { ApiResponse, Environment, Collection, HistoryEntry } from '../types/messages';

interface AppState {
  response: ApiResponse | null;
  loading: boolean;
  error: string | null;
  environments: Environment[];
  activeEnvironmentId: string | null;
  collections: Collection[];
  history: HistoryEntry[];
  responseTab: 'body' | 'headers';
  bodyViewMode: 'pretty' | 'raw' | 'tree';
  sidebarTab: 'collections' | 'environments' | 'history';
  setResponse: (r: ApiResponse | null) => void;
  setLoading: (l: boolean) => void;
  setError: (e: string | null) => void;
  setEnvironments: (e: Environment[]) => void;
  setActiveEnvironmentId: (id: string | null) => void;
  setCollections: (c: Collection[]) => void;
  setHistory: (h: HistoryEntry[]) => void;
  setResponseTab: (t: AppState['responseTab']) => void;
  setBodyViewMode: (m: AppState['bodyViewMode']) => void;
  setSidebarTab: (t: AppState['sidebarTab']) => void;
}

export const useAppStore = create<AppState>((set) => ({
  response: null,
  loading: false,
  error: null,
  environments: [],
  activeEnvironmentId: null,
  collections: [],
  history: [],
  responseTab: 'body',
  bodyViewMode: 'pretty',
  sidebarTab: 'collections',
  setResponse: (response) => set({ response, error: null }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setEnvironments: (environments) => set({ environments }),
  setActiveEnvironmentId: (activeEnvironmentId) => set({ activeEnvironmentId }),
  setCollections: (collections) => set({ collections }),
  setHistory: (history) => set({ history }),
  setResponseTab: (responseTab) => set({ responseTab }),
  setBodyViewMode: (bodyViewMode) => set({ bodyViewMode }),
  setSidebarTab: (sidebarTab) => set({ sidebarTab }),
}));
