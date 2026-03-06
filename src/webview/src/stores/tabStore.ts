import { create } from 'zustand';
import { HttpMethod, KeyValue, RequestBody, AuthConfig, ApiRequest, ApiResponse, TestRule, SetVariable } from '../types/messages';

export interface Tab {
  id: string;
  name: string;
  method: HttpMethod;
  url: string;
  params: KeyValue[];
  headers: KeyValue[];
  body: RequestBody;
  auth: AuthConfig;
  preRequestScript: string;
  testScript: string;
  testRules: TestRule[];
  setVariables: SetVariable[];
  activeTab: 'params' | 'headers' | 'body' | 'auth' | 'tests' | 'scripts';
  sourceRequestId: string | null;
  sourceCollectionId: string | null;
  sourceFolderPath: string[] | null;
  response: ApiResponse | null;
  error: string | null;
  loading: boolean;
}

const defaultHeaders: KeyValue[] = [
  { key: 'Accept', value: 'application/json', enabled: true },
  { key: 'Content-Type', value: 'application/json', enabled: true },
];

function newTab(id?: string): Tab {
  return {
    id: id || Date.now().toString() + Math.random().toString(36).slice(2, 6),
    name: 'New Request',
    method: 'GET',
    url: '',
    params: [],
    headers: [...defaultHeaders],
    body: { type: 'none' },
    auth: { type: 'none' },
    preRequestScript: '',
    testScript: '',
    testRules: [],
    setVariables: [],
    activeTab: 'headers',
    sourceRequestId: null,
    sourceCollectionId: null,
    sourceFolderPath: null,
    response: null,
    error: null,
    loading: false,
  };
}

interface TabStore {
  tabs: Tab[];
  activeTabId: string;
  addTab: () => void;
  closeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  updateTab: (id: string, patch: Partial<Tab>) => void;
  /** Open a request in a new tab (or focus existing tab for same sourceRequestId) */
  openRequest: (r: ApiRequest, collectionId?: string | null, folderPath?: string[] | null, response?: ApiResponse | null) => void;
  getActiveTab: () => Tab;
}

const initialTab = newTab();

export const useTabStore = create<TabStore>((set, get) => ({
  tabs: [initialTab],
  activeTabId: initialTab.id,

  addTab: () => {
    const tab = newTab();
    set((s) => ({ tabs: [...s.tabs, tab], activeTabId: tab.id }));
  },

  closeTab: (id) => set((s) => {
    const remaining = s.tabs.filter((t) => t.id !== id);
    if (remaining.length === 0) {
      const tab = newTab();
      return { tabs: [tab], activeTabId: tab.id };
    }
    const activeGone = s.activeTabId === id;
    return {
      tabs: remaining,
      activeTabId: activeGone ? remaining[Math.max(0, s.tabs.findIndex((t) => t.id === id) - 1)].id : s.activeTabId,
    };
  }),

  setActiveTab: (activeTabId) => set({ activeTabId }),

  updateTab: (id, patch) => set((s) => ({
    tabs: s.tabs.map((t) => t.id === id ? { ...t, ...patch } : t),
  })),

  openRequest: (r, collectionId, folderPath, response) => {
    const { tabs } = get();
    // If already open, focus it
    const existing = tabs.find((t) => t.sourceRequestId && t.sourceRequestId === r.id);
    if (existing) {
      set({ activeTabId: existing.id });
      return;
    }
    const tab = newTab();
    tab.name = r.name || 'Untitled';
    tab.method = r.method;
    tab.url = r.url;
    tab.params = r.params.length ? r.params : [];
    tab.headers = r.headers.length ? r.headers : [...defaultHeaders];
    tab.body = r.body;
    tab.auth = r.auth;
    tab.preRequestScript = r.preRequestScript || '';
    tab.testScript = r.testScript || '';
    tab.testRules = r.testRules || [];
    tab.setVariables = r.setVariables || [];
    tab.sourceRequestId = r.id || null;
    tab.sourceCollectionId = collectionId ?? null;
    tab.sourceFolderPath = folderPath ?? null;
    tab.response = response ?? null;
    set((s) => ({ tabs: [...s.tabs, tab], activeTabId: tab.id }));
  },

  getActiveTab: () => {
    const s = get();
    return s.tabs.find((t) => t.id === s.activeTabId) || s.tabs[0];
  },
}));
