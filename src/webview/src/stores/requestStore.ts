import { create } from 'zustand';
import { HttpMethod, KeyValue, RequestBody, AuthConfig, ApiRequest, TestRule, SetVariable } from '../types/messages';
import { useTabStore } from './tabStore';

function paramsFromUrl(url: string): KeyValue[] {
  try {
    const qIdx = url.indexOf('?');
    if (qIdx === -1) return [];
    const search = url.slice(qIdx + 1);
    const entries = new URLSearchParams(search);
    const params: KeyValue[] = [];
    entries.forEach((value, key) => params.push({ key, value, enabled: true }));
    return params;
  } catch { return []; }
}

function urlWithParams(url: string, params: KeyValue[]): string {
  const enabled = params.filter((p) => p.enabled && p.key.trim());
  const base = url.split('?')[0];
  if (enabled.length === 0) return base;
  const sp = new URLSearchParams();
  enabled.forEach((p) => sp.append(p.key, p.value));
  return `${base}?${sp.toString()}`;
}

const defaultHeaders: KeyValue[] = [
  { key: 'Accept', value: 'application/json', enabled: true },
  { key: 'Content-Type', value: 'application/json', enabled: true },
];

/** Helper: update the active tab in tabStore */
function patchActive(patch: Record<string, unknown>) {
  const { activeTabId, updateTab } = useTabStore.getState();
  updateTab(activeTabId, patch);
}

/** Helper: read from active tab */
function active() {
  return useTabStore.getState().getActiveTab();
}

export interface RequestState {
  // All getters read from active tab via get()
  readonly method: HttpMethod;
  readonly url: string;
  readonly params: KeyValue[];
  readonly headers: KeyValue[];
  readonly body: RequestBody;
  readonly auth: AuthConfig;
  readonly name: string;
  readonly preRequestScript: string;
  readonly testScript: string;
  readonly testRules: TestRule[];
  readonly setVariables: SetVariable[];
  readonly activeTab: 'params' | 'headers' | 'body' | 'auth' | 'tests' | 'scripts';
  readonly sourceRequestId: string | null;
  readonly sourceCollectionId: string | null;
  readonly sourceFolderPath: string[] | null;
  readonly sourceScope: 'local' | 'global';
  setMethod: (m: HttpMethod) => void;
  setUrl: (u: string) => void;
  setUrlRaw: (u: string) => void;
  setParams: (p: KeyValue[]) => void;
  setHeaders: (h: KeyValue[]) => void;
  setBody: (b: RequestBody) => void;
  setAuth: (a: AuthConfig) => void;
  setName: (n: string) => void;
  setPreRequestScript: (s: string) => void;
  setTestScript: (s: string) => void;
  setTestRules: (r: TestRule[]) => void;
  setSetVariables: (v: SetVariable[]) => void;
  setActiveTab: (t: RequestState['activeTab']) => void;
  toApiRequest: () => ApiRequest;
  loadRequest: (r: ApiRequest, collectionId?: string | null, folderPath?: string[] | null) => void;
  reset: () => void;
  /** Sync from tab store — called by subscription */
  _sync: () => void;
}

export const useRequestStore = create<RequestState>((set, get) => {
  // Subscribe to tab store changes and sync
  const syncFromTab = () => {
    const tab = active();
    set({
      method: tab.method,
      url: tab.url,
      params: tab.params,
      headers: tab.headers,
      body: tab.body,
      auth: tab.auth,
      name: tab.name,
      preRequestScript: tab.preRequestScript,
      testScript: tab.testScript,
      testRules: tab.testRules,
      setVariables: tab.setVariables,
      activeTab: tab.activeTab,
      sourceRequestId: tab.sourceRequestId,
      sourceCollectionId: tab.sourceCollectionId,
      sourceFolderPath: tab.sourceFolderPath,
      sourceScope: tab.sourceScope,
    });
  };

  // Subscribe to tab store
  useTabStore.subscribe(syncFromTab);

  const tab = active();
  return {
    method: tab.method,
    url: tab.url,
    params: tab.params,
    headers: tab.headers,
    body: tab.body,
    auth: tab.auth,
    name: tab.name,
    preRequestScript: tab.preRequestScript,
    testScript: tab.testScript,
    testRules: tab.testRules,
    setVariables: tab.setVariables,
    activeTab: tab.activeTab,
    sourceRequestId: tab.sourceRequestId,
    sourceCollectionId: tab.sourceCollectionId,
    sourceFolderPath: tab.sourceFolderPath,
    sourceScope: tab.sourceScope,

    setMethod: (method) => { patchActive({ method }); set({ method }); },
    setUrl: (url) => {
      const extracted = paramsFromUrl(url);
      const params = extracted.length > 0 ? extracted : active().params;
      patchActive({ url, params });
      set({ url, params });
    },
    setUrlRaw: (url) => { patchActive({ url }); set({ url }); },
    setParams: (params) => {
      const url = urlWithParams(active().url, params);
      patchActive({ params, url });
      set({ params, url });
    },
    setHeaders: (headers) => { patchActive({ headers }); set({ headers }); },
    setBody: (body) => { patchActive({ body }); set({ body }); },
    setAuth: (auth) => { patchActive({ auth }); set({ auth }); },
    setName: (name) => { patchActive({ name }); set({ name }); },
    setPreRequestScript: (preRequestScript) => { patchActive({ preRequestScript }); set({ preRequestScript }); },
    setTestScript: (testScript) => { patchActive({ testScript }); set({ testScript }); },
    setTestRules: (testRules) => { patchActive({ testRules }); set({ testRules }); },
    setSetVariables: (setVariables) => { patchActive({ setVariables }); set({ setVariables }); },
    setActiveTab: (activeTab) => { patchActive({ activeTab }); set({ activeTab }); },
    toApiRequest: () => {
      const s = active();
      return {
        id: s.sourceRequestId || Date.now().toString(),
        name: s.name,
        method: s.method,
        url: s.url,
        params: s.params.filter(p => p.key.trim() !== ''),
        headers: s.headers.filter(h => h.key.trim() !== ''),
        body: s.body,
        auth: s.auth,
        preRequestScript: s.preRequestScript || undefined,
        testScript: s.testScript || undefined,
        testRules: s.testRules.length ? s.testRules : undefined,
        setVariables: s.setVariables.length ? s.setVariables : undefined,
      };
    },
    loadRequest: (r, collectionId, folderPath) => {
      // This is called for non-sidebar loads (e.g. history click in response viewer)
      const patch = {
        method: r.method,
        url: r.url,
        params: r.params.length ? r.params : paramsFromUrl(r.url),
        headers: r.headers.length ? r.headers : [...defaultHeaders],
        body: r.body,
        auth: r.auth,
        name: r.name,
        preRequestScript: r.preRequestScript || '',
        testScript: r.testScript || '',
        testRules: r.testRules || [],
        setVariables: r.setVariables || [],
        sourceRequestId: r.id || null,
        sourceCollectionId: collectionId ?? null,
        sourceFolderPath: folderPath ?? null,
        sourceScope: 'local' as const,
      };
      patchActive(patch);
      set(patch);
    },
    reset: () => {
      const patch = {
        method: 'GET' as HttpMethod,
        url: '',
        params: [] as KeyValue[],
        headers: [...defaultHeaders],
        body: { type: 'none' as const },
        auth: { type: 'none' as const },
        name: 'New Request',
        preRequestScript: '',
        testScript: '',
        testRules: [] as TestRule[],
        setVariables: [] as SetVariable[],
        activeTab: 'headers' as const,
        sourceRequestId: null,
        sourceCollectionId: null,
        sourceFolderPath: null,
        sourceScope: 'local' as const,
      };
      patchActive(patch);
      set(patch);
    },
    _sync: syncFromTab,
  };
});
