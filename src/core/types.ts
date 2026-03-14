// Shared types for Open Post

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

export type BodyType = 'none' | 'json' | 'form-data' | 'x-www-form-urlencoded' | 'raw' | 'xml' | 'graphql' | 'binary';

export type AuthType = 'none' | 'basic' | 'bearer' | 'api-key' | 'oauth2' | 'aws-sigv4';

export interface KeyValue {
  key: string;
  value: string;
  enabled: boolean;
}

export interface AuthConfig {
  type: AuthType;
  basic?: { username: string; password: string };
  bearer?: { token: string };
  apiKey?: { key: string; value: string; addTo: 'header' | 'query' };
  oauth2?: {
    grantType: 'authorization_code' | 'client_credentials';
    authUrl: string;
    tokenUrl: string;
    clientId: string;
    clientSecret: string;
    scope: string;
    accessToken?: string;
  };
  awsSigV4?: { accessKey: string; secretKey: string; region: string; service: string };
}

export interface FormDataItem extends KeyValue {
  fieldType: 'text' | 'file';
  filePath?: string;
  fileName?: string;
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

export interface CookieEntry {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires: string | null; // ISO string or null for session
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'Strict' | 'Lax' | 'None' | null;
  createdAt: string;
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

export interface ContractVariantEvent {
  timestamp: number;
  recordId: string;
}

export interface ContractVariant {
  id: string;
  signature: string;
  summary: string;
  sampleBody: string;
  contentType: string;
  firstSeen: number;
  lastSeen: number;
  occurrences: number;
  history: ContractVariantEvent[];
}

export interface ContractStatusBucket {
  status: number;
  latestVariantId: string | null;
  variants: ContractVariant[];
}

export interface ContractVariantPrompt {
  promptId: string;
  snapshotId: string;
  status: number;
  signature: string;
  summary: string;
}

export interface Snapshot {
  id: string;
  name: string;
  createdAt: number;
  baseRequest: ApiRequest;
  records: SnapshotRecord[];
  responseContracts?: ContractStatusBucket[];
}

export interface DeleteHistoryPayload {
  id: string;
}

// Extension <-> Webview message protocol
export type MessageToWebview =
  | { type: 'response'; data: ApiResponse }
  | { type: 'error'; message: string }
  | { type: 'environments'; data: Environment[] }
  | { type: 'collections'; data: Collection[] }
  | { type: 'history'; data: HistoryEntry[] }
  | { type: 'activeEnvironment'; id: string | null }
  | { type: 'filePicked'; purpose: string; filePath: string; fileName: string }
  | { type: 'cookies'; data: CookieEntry[] }
  | { type: 'tabSettings'; data: { tabViewCollapsed: boolean; tabGrouping: boolean; subtleContracts: boolean } }
  | { type: 'snapshots'; data: Snapshot[] }
  | { type: 'contractVariantPrompt'; data: ContractVariantPrompt }
  | { type: 'globalCollections'; data: Collection[] }
  | { type: 'globalEnvironments'; data: Environment[] }
  | { type: 'globalHistory'; data: HistoryEntry[] }
  | { type: 'globalActiveEnvironment'; id: string | null }
  | { type: 'session'; data: unknown };

export type MessageToExtension =
  | { type: 'sendRequest'; data: ApiRequest; sslVerification?: boolean }
  | { type: 'saveRequest'; data: { collectionId: string; folderId?: string; folderPath?: string[]; request: ApiRequest } }
  | { type: 'loadCollections' }
  | { type: 'loadEnvironments' }
  | { type: 'saveEnvironment'; data: Environment }
  | { type: 'deleteEnvironment'; id: string }
  | { type: 'setActiveEnvironment'; id: string | null }
  | { type: 'loadHistory' }
  | { type: 'createCollection'; name: string }
  | { type: 'deleteCollection'; id: string }
  | { type: 'deleteRequest'; collectionId: string; requestId: string; folderPath?: string[] }
  | { type: 'createFolder'; collectionId: string; name: string; parentPath?: string[] }
  | { type: 'deleteFolder'; collectionId: string; folderPath: string[] }
  | { type: 'runPreRequestScript'; script: string; request: ApiRequest }
  | { type: 'runTestScript'; script: string; request: ApiRequest; response: ApiResponse }
  | { type: 'pickFile'; purpose: string }
  | { type: 'clearHistory' }
  | { type: 'deleteHistory'; id: string }
  | { type: 'loadCookies' }
  | { type: 'saveCookie'; data: CookieEntry }
  | { type: 'deleteCookie'; domain: string; name: string; path: string }
  | { type: 'clearCookies' }
  | { type: 'setCookiesEnabled'; enabled: boolean }
  | { type: 'exportCollection'; collectionId: string }
  | { type: 'importCollection' }
  | { type: 'loadTabSettings' }
  | { type: 'setTabSetting'; key: 'tabViewCollapsed' | 'tabGrouping' | 'subtleContracts'; value: boolean }
  | { type: 'loadSnapshots' }
  | { type: 'saveSnapshot'; name?: string; baseRequest: ApiRequest }
  | { type: 'addSnapshotRecord'; snapshotId: string; request: ApiRequest; response: ApiResponse }
  | { type: 'deleteSnapshot'; id: string }
  | { type: 'deleteSnapshotRecord'; snapshotId: string; recordId: string }
  | { type: 'renameSnapshot'; id: string; name: string }
  | { type: 'resolveContractVariantPrompt'; promptId: string; save: boolean }
  | { type: 'loadGlobalCollections' }
  | { type: 'createGlobalCollection'; name: string }
  | { type: 'deleteGlobalCollection'; id: string }
  | { type: 'saveGlobalRequest'; data: { collectionId: string; folderPath?: string[]; request: ApiRequest } }
  | { type: 'deleteGlobalRequest'; collectionId: string; requestId: string; folderPath?: string[] }
  | { type: 'createGlobalFolder'; collectionId: string; name: string; parentPath?: string[] }
  | { type: 'deleteGlobalFolder'; collectionId: string; folderPath: string[] }
  | { type: 'loadGlobalEnvironments' }
  | { type: 'saveGlobalEnvironment'; data: Environment }
  | { type: 'deleteGlobalEnvironment'; id: string }
  | { type: 'setGlobalActiveEnvironment'; id: string | null }
  | { type: 'loadGlobalHistory' }
  | { type: 'clearGlobalHistory' }
  | { type: 'log'; level: 'info' | 'warn' | 'error'; message: string; data?: string }
  | { type: 'loadSession' }
  | { type: 'saveSession'; data: unknown };
