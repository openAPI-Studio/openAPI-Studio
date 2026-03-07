// Re-export shared types for webview usage
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';
export type BodyType = 'none' | 'json' | 'form-data' | 'x-www-form-urlencoded' | 'raw' | 'xml' | 'graphql' | 'binary';
export type AuthType = 'none' | 'basic' | 'bearer' | 'api-key' | 'oauth2' | 'aws-sigv4';

export interface KeyValue { key: string; value: string; enabled: boolean; }

export interface AuthConfig {
  type: AuthType;
  basic?: { username: string; password: string };
  bearer?: { token: string };
  apiKey?: { key: string; value: string; addTo: 'header' | 'query' };
  oauth2?: { grantType: 'authorization_code' | 'client_credentials'; authUrl: string; tokenUrl: string; clientId: string; clientSecret: string; scope: string; accessToken?: string };
  awsSigV4?: { accessKey: string; secretKey: string; region: string; service: string };
}

export interface FormDataItem extends KeyValue {
  fieldType: 'text' | 'file';
  filePath?: string;
  fileName?: string;
}

export interface CookieEntry {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires: string | null;
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'Strict' | 'Lax' | 'None' | null;
  createdAt: string;
}

export interface RequestBody {
  type: BodyType;
  raw?: string;
  formData?: KeyValue[];
  formDataFiles?: FormDataItem[];
  graphql?: { query: string; variables: string };
  binaryPath?: string;
  binaryName?: string;
}

export interface ApiRequest {
  id: string;
  name: string;
  method: HttpMethod;
  url: string;
  params: KeyValue[];
  headers: KeyValue[];
  body: RequestBody;
  auth: AuthConfig;
  preRequestScript?: string;
  testScript?: string;
  testRules?: TestRule[];
  setVariables?: SetVariable[];
}

export type TestSource = 'status' | 'time' | 'size' | 'body' | 'jsonpath' | 'header' | 'content-type' | 'content-length' | 'body-contains' | 'body-is-json' | 'body-schema';
export type TestOperator = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'not-contains' | 'matches' | 'not-matches' | 'is-empty' | 'is-not-empty' | 'exists' | 'not-exists' | 'is-type';

export interface TestRule {
  id: string;
  source: TestSource;
  property: string;
  operator: TestOperator;
  expected: string;
  enabled: boolean;
}

export interface TestResult {
  ruleId: string;
  passed: boolean;
  label: string;
  actual: string;
  expected: string;
}

export interface SetVariable {
  id: string;
  source: 'jsonpath' | 'header' | 'body' | 'regex';
  property: string;
  variableName: string;
  enabled: boolean;
}

export interface ApiResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  time: number;
  size: number;
  cookies?: CookieEntry[];
  testResults?: TestResult[];
}

export interface Environment {
  id: string;
  name: string;
  variables: KeyValue[];
}

export interface CollectionFolder {
  id: string;
  name: string;
  requests: ApiRequest[];
  folders: CollectionFolder[];
}

export interface Collection {
  id: string;
  name: string;
  folders: CollectionFolder[];
  requests: ApiRequest[];
  variables: KeyValue[];
}

export interface HistoryEntry {
  id: string;
  timestamp: number;
  request: ApiRequest;
  response: ApiResponse;
}

export interface SnapshotRecord {
  id: string;
  timestamp: number;
  request: ApiRequest;
  response: ApiResponse;
}

export interface Snapshot {
  id: string;
  name: string;
  createdAt: number;
  baseRequest: ApiRequest;
  records: SnapshotRecord[];
}

// VS Code webview API
interface VsCodeApi {
  postMessage(msg: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
}

declare function acquireVsCodeApi(): VsCodeApi;

const vscode = acquireVsCodeApi();

export function postMessage(msg: unknown) {
  vscode.postMessage(msg);
}

export function onMessage(handler: (msg: unknown) => void) {
  window.addEventListener('message', (e) => handler(e.data));
}
