import { create } from 'zustand';
import { HttpMethod, KeyValue, RequestBody, AuthConfig, ApiRequest } from '../types/messages';

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

interface RequestState {
  method: HttpMethod;
  url: string;
  params: KeyValue[];
  headers: KeyValue[];
  body: RequestBody;
  auth: AuthConfig;
  name: string;
  preRequestScript: string;
  testScript: string;
  activeTab: 'params' | 'headers' | 'body' | 'auth' | 'scripts';
  sourceRequestId: string | null;
  sourceCollectionId: string | null;
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
  setActiveTab: (t: RequestState['activeTab']) => void;
  toApiRequest: () => ApiRequest;
  loadRequest: (r: ApiRequest, collectionId?: string | null) => void;
  reset: () => void;
}

const defaultHeaders: KeyValue[] = [
  { key: 'Accept', value: 'application/json', enabled: true },
  { key: 'Content-Type', value: 'application/json', enabled: true },
];

const defaultState = {
  method: 'GET' as HttpMethod,
  url: '',
  params: [] as KeyValue[],
  headers: [...defaultHeaders],
  body: { type: 'none' as const },
  auth: { type: 'none' as const },
  name: 'New Request',
  preRequestScript: '',
  testScript: '',
  activeTab: 'headers' as const,
  sourceRequestId: null as string | null,
  sourceCollectionId: null as string | null,
};

export const useRequestStore = create<RequestState>((set, get) => ({
  ...defaultState,
  setMethod: (method) => set({ method }),
  // setUrl: parses query params from URL and syncs to params list
  setUrl: (url) => {
    const extracted = paramsFromUrl(url);
    set({ url, params: extracted.length > 0 ? extracted : get().params.length > 0 ? get().params : [] });
  },
  // setUrlRaw: sets URL without touching params (used by curl import / loadRequest)
  setUrlRaw: (url) => set({ url }),
  // setParams: rebuilds URL query string from params
  setParams: (params) => {
    const url = urlWithParams(get().url, params);
    set({ params, url });
  },
  setHeaders: (headers) => set({ headers }),
  setBody: (body) => set({ body }),
  setAuth: (auth) => set({ auth }),
  setName: (name) => set({ name }),
  setPreRequestScript: (preRequestScript) => set({ preRequestScript }),
  setTestScript: (testScript) => set({ testScript }),
  setActiveTab: (activeTab) => set({ activeTab }),
  toApiRequest: () => {
    const s = get();
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
    };
  },
  loadRequest: (r, collectionId) => set({
    method: r.method,
    url: r.url,
    params: r.params.length ? r.params : paramsFromUrl(r.url),
    headers: r.headers.length ? r.headers : [...defaultHeaders],
    body: r.body,
    auth: r.auth,
    name: r.name,
    preRequestScript: r.preRequestScript || '',
    testScript: r.testScript || '',
    sourceRequestId: r.id || null,
    sourceCollectionId: collectionId ?? null,
  }),
  reset: () => set({ ...defaultState, headers: [...defaultHeaders] }),
}));
