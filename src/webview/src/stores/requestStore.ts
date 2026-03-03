import { create } from 'zustand';
import { HttpMethod, KeyValue, RequestBody, AuthConfig, ApiRequest } from '../types/messages';

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
  setMethod: (m: HttpMethod) => void;
  setUrl: (u: string) => void;
  setParams: (p: KeyValue[]) => void;
  setHeaders: (h: KeyValue[]) => void;
  setBody: (b: RequestBody) => void;
  setAuth: (a: AuthConfig) => void;
  setName: (n: string) => void;
  setPreRequestScript: (s: string) => void;
  setTestScript: (s: string) => void;
  setActiveTab: (t: RequestState['activeTab']) => void;
  toApiRequest: () => ApiRequest;
  loadRequest: (r: ApiRequest) => void;
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
};

export const useRequestStore = create<RequestState>((set, get) => ({
  ...defaultState,
  setMethod: (method) => set({ method }),
  setUrl: (url) => set({ url }),
  setParams: (params) => set({ params }),
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
      id: Date.now().toString(),
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
  loadRequest: (r) => set({
    method: r.method,
    url: r.url,
    params: r.params.length ? r.params : [],
    headers: r.headers.length ? r.headers : [...defaultHeaders],
    body: r.body,
    auth: r.auth,
    name: r.name,
    preRequestScript: r.preRequestScript || '',
    testScript: r.testScript || '',
  }),
  reset: () => set({ ...defaultState, headers: [...defaultHeaders] }),
}));
