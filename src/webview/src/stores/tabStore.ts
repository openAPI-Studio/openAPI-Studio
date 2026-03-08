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
  sourceScope: 'local' | 'global';
  response: ApiResponse | null;
  error: string | null;
  loading: boolean;
  groupId: string | null;
}

export interface TabGroup {
  id: string;
  name: string;
  color: string;
  collapsed: boolean;
}

export const GROUP_COLORS = ['#4285f4', '#ea4335', '#fbbc04', '#34a853', '#ff6d01', '#46bdc6', '#9334e6', '#e8710a'];

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
    sourceScope: 'local',
    response: null,
    error: null,
    loading: false,
    groupId: null,
  };
}

interface TabStore {
  tabs: Tab[];
  groups: TabGroup[];
  activeTabId: string;
  addTab: () => void;
  closeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  updateTab: (id: string, patch: Partial<Tab>) => void;
  openRequest: (r: ApiRequest, collectionId?: string | null, folderPath?: string[] | null, response?: ApiResponse | null, scope?: 'local' | 'global') => void;
  getActiveTab: () => Tab;
  createGroup: (name?: string) => string;
  renameGroup: (id: string, name: string) => void;
  setGroupColor: (id: string, color: string) => void;
  deleteGroup: (id: string) => void;
  toggleGroupCollapsed: (id: string) => void;
  moveTabToGroup: (tabId: string, groupId: string | null) => void;
  addTabToNewGroup: (tabId: string) => void;
  reorderTab: (tabId: string, targetIdx: number, targetGroupId: string | null) => void;
  restoreSession: (data: { tabs: Tab[]; groups: TabGroup[]; activeTabId: string }) => void;
  hydrateResponses: (history: { request: { url: string; method: string }; response: ApiResponse }[]) => void;
}

export function getSessionData(state: { tabs: Tab[]; groups: TabGroup[]; activeTabId: string }) {
  return {
    tabs: state.tabs.map(t => ({ ...t, response: null, error: null, loading: false })),
    groups: state.groups,
    activeTabId: state.activeTabId,
  };
}

const initialTab = newTab();

export const useTabStore = create<TabStore>((set, get) => ({
  tabs: [initialTab],
  groups: [],
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
    const closedIdx = s.tabs.findIndex((t) => t.id === id);
    // Clean up empty groups
    const closedTab = s.tabs.find((t) => t.id === id);
    let groups = s.groups;
    if (closedTab?.groupId) {
      const groupStillHasTabs = remaining.some((t) => t.groupId === closedTab.groupId);
      if (!groupStillHasTabs) groups = groups.filter((g) => g.id !== closedTab.groupId);
    }
    return {
      tabs: remaining,
      groups,
      activeTabId: activeGone ? remaining[Math.max(0, closedIdx - 1)].id : s.activeTabId,
    };
  }),

  setActiveTab: (activeTabId) => set({ activeTabId }),

  updateTab: (id, patch) => set((s) => ({
    tabs: s.tabs.map((t) => t.id === id ? { ...t, ...patch } : t),
  })),

  openRequest: (r, collectionId, folderPath, response, scope) => {
    const { tabs } = get();
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
    tab.sourceScope = scope || 'local';
    tab.response = response ?? null;
    set((s) => ({ tabs: [...s.tabs, tab], activeTabId: tab.id }));
  },

  getActiveTab: () => {
    const s = get();
    return s.tabs.find((t) => t.id === s.activeTabId) || s.tabs[0];
  },

  createGroup: (name) => {
    const id = Date.now().toString() + Math.random().toString(36).slice(2, 6);
    const color = GROUP_COLORS[get().groups.length % GROUP_COLORS.length];
    set((s) => ({ groups: [...s.groups, { id, name: name || `Group ${s.groups.length + 1}`, color, collapsed: false }] }));
    return id;
  },

  renameGroup: (id, name) => set((s) => ({
    groups: s.groups.map((g) => g.id === id ? { ...g, name } : g),
  })),

  setGroupColor: (id, color) => set((s) => ({
    groups: s.groups.map((g) => g.id === id ? { ...g, color } : g),
  })),

  deleteGroup: (id) => set((s) => ({
    groups: s.groups.filter((g) => g.id !== id),
    tabs: s.tabs.map((t) => t.groupId === id ? { ...t, groupId: null } : t),
  })),

  toggleGroupCollapsed: (id) => set((s) => ({
    groups: s.groups.map((g) => g.id === id ? { ...g, collapsed: !g.collapsed } : g),
  })),

  moveTabToGroup: (tabId, groupId) => set((s) => {
    const tabs = s.tabs.map((t) => t.id === tabId ? { ...t, groupId } : t);
    // Clean up empty groups
    const oldTab = s.tabs.find((t) => t.id === tabId);
    let groups = s.groups;
    if (oldTab?.groupId && oldTab.groupId !== groupId) {
      const stillHasTabs = tabs.some((t) => t.groupId === oldTab.groupId);
      if (!stillHasTabs) groups = groups.filter((g) => g.id !== oldTab.groupId);
    }
    return { tabs, groups };
  }),

  addTabToNewGroup: (tabId) => {
    const groupId = get().createGroup();
    get().moveTabToGroup(tabId, groupId);
  },

  reorderTab: (tabId, targetIdx, targetGroupId) => set((s) => {
    const tab = s.tabs.find((t) => t.id === tabId);
    if (!tab) return s;
    const without = s.tabs.filter((t) => t.id !== tabId);
    const moved = { ...tab, groupId: targetGroupId };
    const idx = Math.min(targetIdx, without.length);
    const tabs = [...without.slice(0, idx), moved, ...without.slice(idx)];
    // Clean up empty groups
    let groups = s.groups;
    if (tab.groupId && tab.groupId !== targetGroupId) {
      if (!tabs.some((t) => t.groupId === tab.groupId)) {
        groups = groups.filter((g) => g.id !== tab.groupId);
      }
    }
    return { tabs, groups };
  }),

  restoreSession: (data) => {
    if (!data || !Array.isArray(data.tabs) || data.tabs.length === 0) return;
    const tabs = data.tabs.map((t: any) => ({ ...t, response: null, error: null, loading: false }));
    set({ tabs, groups: data.groups || [], activeTabId: data.activeTabId || tabs[0].id });
  },

  hydrateResponses: (history) => set((s) => {
    let changed = false;
    const tabs = s.tabs.map((t) => {
      if (t.response || !t.url) return t;
      const match = history.slice().reverse().find((h) => h.request.url === t.url && h.request.method === t.method);
      if (match) { changed = true; return { ...t, response: match.response }; }
      return t;
    });
    return changed ? { tabs } : s;
  }),
}));
